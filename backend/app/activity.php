<?php
declare(strict_types=1);

function neximatrix_log_activity(
    PDO $pdo,
    ?int $actorId,
    string $actorRole,
    string $action,
    ?string $entityType = null,
    ?int $entityId = null,
    array $metadata = []
): void {
    $statement = $pdo->prepare(
        'INSERT INTO activity_logs
            (actor_user_id, actor_role, action, entity_type, entity_id, metadata, ip_address, user_agent)
         VALUES
            (:actor_user_id, :actor_role, :action, :entity_type, :entity_id, :metadata, :ip_address, :user_agent)'
    );
    $statement->execute([
        ':actor_user_id' => $actorId,
        ':actor_role' => $actorRole,
        ':action' => $action,
        ':entity_type' => $entityType,
        ':entity_id' => $entityId,
        ':metadata' => $metadata === [] ? null : json_encode($metadata, JSON_UNESCAPED_UNICODE),
        ':ip_address' => neximatrix_client_ip(),
        ':user_agent' => neximatrix_user_agent(),
    ]);
}
