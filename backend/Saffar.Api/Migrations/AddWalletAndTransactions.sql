-- =====================================================================
-- Saffar — Wallet & Payment schema
--
-- Apply via:
--   dotnet ef migrations add AddWalletAndTransactions
--   dotnet ef database update
--
-- Or, as a manual fallback, run this file directly against SaffarDb.
-- =====================================================================

CREATE TABLE [dbo].[Wallets] (
    [Id]         UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Wallets] PRIMARY KEY,
    [UserId]     UNIQUEIDENTIFIER NOT NULL,
    [Balance]    DECIMAL(18, 2)   NOT NULL CONSTRAINT [DF_Wallets_Balance] DEFAULT (0),
    [CreatedAt]  DATETIME2        NOT NULL,
    [UpdatedAt]  DATETIME2        NOT NULL,
    CONSTRAINT [FK_Wallets_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

CREATE UNIQUE INDEX [IX_Wallets_UserId] ON [dbo].[Wallets] ([UserId]);

CREATE TABLE [dbo].[WalletTransactions] (
    [Id]              UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_WalletTransactions] PRIMARY KEY,
    [UserId]          UNIQUEIDENTIFIER NOT NULL,
    [Amount]          DECIMAL(18, 2)   NOT NULL,
    [Type]            INT              NOT NULL, -- 0=TopUp, 1=RidePayment, 2=Refund, 3=DriverEarning
    [Status]          INT              NOT NULL, -- 0=Pending, 1=Success, 2=Failed
    [ReferenceId]     NVARCHAR(100)    NULL,
    [IdempotencyKey]  NVARCHAR(64)     NULL,
    [Description]     NVARCHAR(255)    NULL,
    [CreatedAt]       DATETIME2        NOT NULL,
    CONSTRAINT [FK_WalletTransactions_Users_UserId]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

CREATE INDEX [IX_WalletTransactions_UserId_CreatedAt]
    ON [dbo].[WalletTransactions] ([UserId], [CreatedAt]);

-- Idempotency: collapse duplicate top-ups (mobile retry / double-tap) onto
-- the original row so the user is never charged twice. Filtered so multiple
-- legacy NULL-key rows are still allowed.
CREATE UNIQUE INDEX [IX_WalletTransactions_UserId_IdempotencyKey]
    ON [dbo].[WalletTransactions] ([UserId], [IdempotencyKey])
    WHERE [IdempotencyKey] IS NOT NULL;

-- Backfill: every existing user gets a zero-balance wallet so the API works
-- without re-registering. Keep this idempotent — safe to re-run.
INSERT INTO [dbo].[Wallets] ([Id], [UserId], [Balance], [CreatedAt], [UpdatedAt])
SELECT NEWID(), u.[Id], 0, SYSUTCDATETIME(), SYSUTCDATETIME()
FROM   [dbo].[Users] u
WHERE  NOT EXISTS (SELECT 1 FROM [dbo].[Wallets] w WHERE w.[UserId] = u.[Id]);
