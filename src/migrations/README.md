# MongoDB Migrations

This directory previously contained migration scripts for database setup.

Since the application now uses MongoDB without specific migrations:

1. **Directory creation** has been moved to `/src/utils/directoryUtil.ts`
2. **Index creation** has been added directly to the model files

If you need to add structured migrations in the future, consider using:

- [migrate-mongo](https://www.npmjs.com/package/migrate-mongo)
- [mongodb-migrations](https://www.npmjs.com/package/mongodb-migrations)
- [mongoose-migrate](https://www.npmjs.com/package/mongoose-migrate)

These tools can help you manage database changes in a more structured way if needed.
