using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Saffar.Api.Data
{
    public class SaffarDbContextFactory : IDesignTimeDbContextFactory<SaffarDbContext>
    {
        public SaffarDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SaffarDbContext>();
            optionsBuilder.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=SaffarDb;Trusted_Connection=True;TrustServerCertificate=True;");
            return new SaffarDbContext(optionsBuilder.Options);
        }
    }
}
