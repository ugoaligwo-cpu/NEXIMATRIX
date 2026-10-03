-- Add wallet_snapshot column to deposits table
-- Stores the wallet address shown to the user at the time of deposit submission
-- This preserves the original reference even if admin later changes the wallet configuration

ALTER TABLE deposits
    ADD COLUMN wallet_snapshot VARCHAR(255) NULL AFTER evidence_path;
