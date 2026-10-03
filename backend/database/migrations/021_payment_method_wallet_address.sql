-- Add wallet_address column to payment_method_display_configs
-- This allows administrators to configure wallet addresses for each payment method

ALTER TABLE payment_method_display_configs
    ADD COLUMN wallet_address VARCHAR(255) NULL AFTER public_instructions;
