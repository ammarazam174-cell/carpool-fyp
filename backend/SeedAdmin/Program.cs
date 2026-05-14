using Microsoft.Data.SqlClient;

const string ConnectionString =
    "Server=localhost\\SQLEXPRESS;Database=SaffarDb;Trusted_Connection=True;TrustServerCertificate=True;";

const string Email = "admin@saffar.pk";
const string Password = "admin@123";
const string FullName = "Saffar Admin";
const string PhoneNumber = "03000000001";

var passwordHash = BCrypt.Net.BCrypt.HashPassword(Password);

using var conn = new SqlConnection(ConnectionString);
conn.Open();

using (var check = new SqlCommand(
    "SELECT Id, Role FROM Users WHERE Email = @e", conn))
{
    check.Parameters.AddWithValue("@e", Email);
    using var r = check.ExecuteReader();
    if (r.Read())
    {
        Console.WriteLine($"User with email '{Email}' already exists (Id={r.GetGuid(0)}, Role={r.GetString(1)}). Updating password + role to Admin.");
        r.Close();

        using var update = new SqlCommand(@"
UPDATE Users
SET PasswordHash = @pwh,
    Role = 'Admin',
    IsVerified = 1,
    IsProfileComplete = 1,
    IsEmailVerified = 1,
    EmailVerifiedAt = @now,
    FullName = COALESCE(NULLIF(FullName, ''), @fn)
WHERE Email = @e", conn);
        update.Parameters.AddWithValue("@pwh", passwordHash);
        update.Parameters.AddWithValue("@now", DateTime.UtcNow);
        update.Parameters.AddWithValue("@fn", FullName);
        update.Parameters.AddWithValue("@e", Email);
        var rows = update.ExecuteNonQuery();
        Console.WriteLine($"Updated {rows} row(s).");
        return;
    }
}

using (var phoneCheck = new SqlCommand(
    "SELECT COUNT(1) FROM Users WHERE PhoneNumber = @p", conn))
{
    phoneCheck.Parameters.AddWithValue("@p", PhoneNumber);
    if ((int)phoneCheck.ExecuteScalar() > 0)
    {
        Console.Error.WriteLine($"Phone number {PhoneNumber} is already taken — pick a different one and re-run.");
        Environment.Exit(1);
    }
}

using var insert = new SqlCommand(@"
INSERT INTO Users
    (Id, FullName, PhoneNumber, Role, Email, PasswordHash,
     Earnings, Rating, CreatedAt,
     IsVerified, IsProfileComplete,
     IsDriverApproved, DriverStatus,
     IsEmailVerified, EmailVerifiedAt)
VALUES
    (@id, @fn, @ph, 'Admin', @em, @pwh,
     0, 0, @now,
     1, 1,
     0, 'Approved',
     1, @now)", conn);

insert.Parameters.AddWithValue("@id", Guid.NewGuid());
insert.Parameters.AddWithValue("@fn", FullName);
insert.Parameters.AddWithValue("@ph", PhoneNumber);
insert.Parameters.AddWithValue("@em", Email);
insert.Parameters.AddWithValue("@pwh", passwordHash);
insert.Parameters.AddWithValue("@now", DateTime.UtcNow);

insert.ExecuteNonQuery();
Console.WriteLine($"Admin user created: {Email} / {Password}");
