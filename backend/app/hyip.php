<?php
declare(strict_types=1);

function neximatrix_hyip_storage_root(): string
{
    return dirname(__DIR__) . '/storage/hyip-imports';
}

function neximatrix_hyip_ensure_storage(): string
{
    $root = neximatrix_hyip_storage_root();
    if (!is_dir($root) && !mkdir($root, 0700, true) && !is_dir($root)) {
        throw new RuntimeException('HYIP staging directory could not be created.');
    }

    $htaccess = $root . '/.htaccess';
    if (!is_file($htaccess)) {
        file_put_contents($htaccess, "Options -Indexes\nRequire all denied\n", LOCK_EX);
    }

    return $root;
}

function neximatrix_hyip_safe_filename(string $name): string
{
    $name = basename(str_replace('\\', '/', $name));
    $name = preg_replace('/[^A-Za-z0-9._-]/', '-', $name) ?? 'hyip-upload.zip';
    return substr($name, 0, 120) ?: 'hyip-upload.zip';
}

function neximatrix_hyip_remove_directory(string $directory): void
{
    if (!is_dir($directory)) {
        return;
    }

    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        if ($item->isDir()) {
            @rmdir($item->getPathname());
        } else {
            @unlink($item->getPathname());
        }
    }
    @rmdir($directory);
}

function neximatrix_hyip_preflight(string $directory): array
{
    $adminFile = $directory . '/admin.php';
    $publicFile = $directory . '/index.php';
    $settingsFile = $directory . '/settings_default.php';
    $installFile = $directory . '/install.php';
    $encoded = false;

    foreach ([$adminFile, $publicFile] as $entryFile) {
        if (!is_file($entryFile)) {
            continue;
        }
        $head = (string) file_get_contents($entryFile, false, null, 0, 8192);
        if (stripos($head, 'ionCube') !== false || stripos($head, '_il_exec') !== false) {
            $encoded = true;
            break;
        }
    }

    $financialMarkers = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $item) {
        if (!$item->isFile()) {
            continue;
        }
        $relative = ltrim(str_replace('\\', '/', substr($item->getPathname(), strlen($directory))), '/');
        if (preg_match('/(deposit|withdraw|investment|profit|payment|wallet|earning|referral)/i', $relative)) {
            $financialMarkers[] = $relative;
            if (count($financialMarkers) >= 50) {
                break;
            }
        }
    }

    $blockers = [];
    if (!is_file($adminFile)) {
        $blockers[] = 'admin.php was not found at the archive root.';
    }
    if (!is_file($publicFile)) {
        $blockers[] = 'index.php was not found at the archive root.';
    }
    if ($encoded && !(extension_loaded('ionCube Loader') || function_exists('_il_exec'))) {
        $blockers[] = 'The entry points are ionCube encoded, but the ionCube Loader is not available.';
    }
    if ($financialMarkers !== []) {
        $blockers[] = 'Financial feature files are present; activation is disabled until they are reviewed.';
    }
    if (!is_dir($directory . '/inc') || !is_dir($directory . '/tmpl')) {
        $blockers[] = 'The expected inc/ or tmpl/ directories are missing.';
    }

    return [
        'status' => 'staged',
        'adminEntryFound' => is_file($adminFile),
        'publicEntryFound' => is_file($publicFile),
        'settingsFileFound' => is_file($settingsFile),
        'installerFound' => is_file($installFile),
        'ionCubeEncoded' => $encoded,
        'ionCubeLoaderAvailable' => extension_loaded('ionCube Loader') || function_exists('_il_exec'),
        'phpVersion' => PHP_VERSION,
        'financialFeatureMarkers' => $financialMarkers,
        'blockers' => $blockers,
        'activated' => false,
    ];
}

function neximatrix_hyip_stage_upload(array $file): array
{
    if (!class_exists('ZipArchive')) {
        neximatrix_http_error('The PHP ZipArchive extension is required to import a HYIP archive.', 503);
    }

    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error !== UPLOAD_ERR_OK) {
        $message = $error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE
            ? 'The uploaded archive is larger than the server upload limit.'
            : 'The HYIP archive upload failed.';
        neximatrix_http_error($message, 422);
    }

    $temporaryPath = (string) ($file['tmp_name'] ?? '');
    $originalName = neximatrix_hyip_safe_filename((string) ($file['name'] ?? 'hyip-upload.zip'));
    if ($temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
        neximatrix_http_error('The uploaded archive could not be verified.', 422);
    }
    if (strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) !== 'zip') {
        neximatrix_http_error('Only .zip HYIP archives are accepted.', 422);
    }
    $size = (int) ($file['size'] ?? 0);
    if ($size < 1 || $size > 32 * 1024 * 1024) {
        neximatrix_http_error('The HYIP archive must be between 1 byte and 32 MB.', 422);
    }

    $root = neximatrix_hyip_ensure_storage();
    $runId = gmdate('YmdHis') . '-' . bin2hex(random_bytes(6));
    $runDirectory = $root . '/' . $runId;
    if (!mkdir($runDirectory, 0700, true) && !is_dir($runDirectory)) {
        throw new RuntimeException('HYIP staging directory could not be created.');
    }

    try {
        $zip = new ZipArchive();
        $opened = $zip->open($temporaryPath);
        if ($opened !== true) {
            neximatrix_http_error('The uploaded file is not a readable ZIP archive.', 422);
        }

        $entryCount = $zip->numFiles;
        $totalUncompressed = 0;
        $skippedAccessFiles = 0;
        if ($entryCount > 10000) {
            $zip->close();
            neximatrix_http_error('The archive contains too many files.', 422);
        }

        for ($index = 0; $index < $entryCount; $index++) {
            $stat = $zip->statIndex($index);
            $name = is_array($stat) ? (string) ($stat['name'] ?? '') : '';
            $normalized = str_replace('\\', '/', $name);
            if ($normalized === '' || str_contains($normalized, "\0") || str_starts_with($normalized, '/') || preg_match('#(^|/)\.\.(/|$)#', $normalized) || preg_match('#^[A-Za-z]:#', $normalized)) {
                $zip->close();
                neximatrix_http_error('The archive contains an unsafe file path.', 422);
            }
            if (basename($normalized) === '.htaccess') {
                $skippedAccessFiles++;
                continue;
            }
            if (basename($normalized) === '.env' || str_ends_with(strtolower($normalized), '.env')) {
                $zip->close();
                neximatrix_http_error('Environment files are not allowed in an imported archive.', 422);
            }
            if (is_array($stat)) {
                $mode = ((int) ($stat['external_attr'] ?? 0)) >> 16;
                if (($mode & 0xF000) === 0xA000) {
                    $zip->close();
                    neximatrix_http_error('Symbolic links are not allowed in an imported archive.', 422);
                }
                $totalUncompressed += (int) ($stat['size'] ?? 0);
            }
            if ($totalUncompressed > 200 * 1024 * 1024) {
                $zip->close();
                neximatrix_http_error('The expanded archive is larger than 200 MB.', 422);
            }
        }

        if (!$zip->extractTo($runDirectory)) {
            $zip->close();
            throw new RuntimeException('The HYIP archive could not be extracted.');
        }
        $zip->close();

        $accessFiles = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($runDirectory, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($accessFiles as $accessFile) {
            if ($accessFile->isFile() && strtolower($accessFile->getFilename()) === '.htaccess') {
                @unlink($accessFile->getPathname());
            }
        }

        $hash = hash_file('sha256', $temporaryPath);
        $manifest = [
            'id' => $runId,
            'originalName' => $originalName,
            'sha256' => $hash,
            'size' => $size,
            'entryCount' => $entryCount,
            'skippedAccessFiles' => $skippedAccessFiles,
            'stagedAt' => gmdate('c'),
            'preflight' => neximatrix_hyip_preflight($runDirectory),
        ];
        file_put_contents(
            $runDirectory . '/manifest.json',
            json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            LOCK_EX
        );

        return $manifest;
    } catch (Throwable $exception) {
        neximatrix_hyip_remove_directory($runDirectory);
        throw $exception;
    }
}

function neximatrix_hyip_imports(): array
{
    $root = neximatrix_hyip_ensure_storage();
    $imports = [];
    foreach (glob($root . '/*', GLOB_ONLYDIR) ?: [] as $directory) {
        $manifestFile = $directory . '/manifest.json';
        if (!is_file($manifestFile)) {
            continue;
        }
        $manifest = json_decode((string) file_get_contents($manifestFile), true);
        if (is_array($manifest)) {
            $imports[] = $manifest;
        }
    }
    usort($imports, static fn (array $left, array $right): int => strcmp((string) ($right['stagedAt'] ?? ''), (string) ($left['stagedAt'] ?? '')));
    return array_slice($imports, 0, 20);
}
