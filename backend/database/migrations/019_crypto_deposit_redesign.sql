USE neximatrix;

-- ─── Crypto Deposit Redesign ────────────────────────────────────────────────
-- Add network field to deposits table
ALTER TABLE deposits
    ADD COLUMN network VARCHAR(40) NULL AFTER method,
    ADD COLUMN request_reference VARCHAR(64) NULL AFTER reference,
    ADD COLUMN evidence_path VARCHAR(255) NULL AFTER proof_file;

-- Create crypto networks configuration table
CREATE TABLE IF NOT EXISTS crypto_networks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    network_key VARCHAR(40) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    description TEXT NULL,
    wallet_address VARCHAR(255) NULL,
    qr_code_path VARCHAR(255) NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    display_order INT UNSIGNED NOT NULL DEFAULT 0,
    min_deposit DECIMAL(18, 8) NULL,
    max_deposit DECIMAL(18, 8) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_crypto_networks_key (network_key),
    KEY idx_crypto_networks_enabled (is_enabled, display_order)
) ENGINE=InnoDB;

-- Seed default crypto networks
INSERT INTO crypto_networks (network_key, display_name, currency_symbol, description, wallet_address, is_enabled, display_order) VALUES
('btc', 'Bitcoin (BTC)', 'BTC', 'Bitcoin network - Send BTC to the provided wallet address', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 1, 1),
('eth', 'Ethereum (ETH)', 'ETH', 'Ethereum network - Send ETH to the provided wallet address', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 1, 2),
('usdt_trc20', 'USDT (TRC20)', 'USDT', 'Tron TRC20 network - Send USDT to the provided wallet address', 'TJyfVq3gQ7z5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5', 1, 3),
('usdt_erc20', 'USDT (ERC20)', 'USDT', 'Ethereum ERC20 network - Send USDT to the provided wallet address', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 1, 4)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Add cancelled status to deposits
ALTER TABLE deposits MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending';
