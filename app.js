var program = require('commander')
	, mysql = require('mysql')
	, Table = require('cli-table');

program
	.command('list <username> <passsword>')
	.option('-h, --host <host>', 'Database host')
	.option('-d, --database <database>', 'Select a database')
	.action(function (username, password, options) {
		if (options.database) {
			var pool = mysql.createPool({
				connectionLimit: 10,
				host: options.host || '127.0.0.1',
				user: username,
				password: password,
				database: options.database
			});
			pool.getConnection(function (err, connection) {
				connection.query('show tables')
					.on('error', function (err) {
						console.log(err);
					})
					.on('result', function (row) {
						// Pausing the connnection is useful if your processing involves I/O 
						connection.pause();
						console.log('\n\n\t\t\t Table: ' + row.Tables_in_WhySoCirrus + '\n');
						var table = new Table({
							head: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra']
							// , colWidths: [100, 100, 100, 100, 100, 100]
						});
						pool.getConnection(function (err, innerconnection) {
							innerconnection.query('describe ' + row.Tables_in_WhySoCirrus)
								.on('error', function (err) {
									console.log(err);
								})
								.on('result', function (row) {
									table.push(
										[row.Field, row.Type, row.Null, row.Key, row.Default, row.Extra]
										);
								})
								.on('end', function () {
									console.log(table.toString());
									connection.resume();
								});
						});
					})
					.on('end', function () {
						connection.release();
						process.exit(1);
					});
			});
		}
	});
program.parse(process.argv);