var program = require('commander')
	, mysql = require('mysql')
	, Table = require('cli-table')
	, tty = require('tty')
	, username = require('username');

program
	.command('tables:describe')
	.option('-h, --host <host>', 'Database host')
	.option('-u, --username <username>', 'Username for selected host')
	.option('-d, --database <database>', 'Select a database')
	.action(function (options) {
		options.username = options.username || username.sync();
		var password = "";
		var stop = false;
		process.stdin.setRawMode(true);
		process.stdout.write("Password for " + options.username + "@" + options.host + ": ");
		process.stdin.on('data', function (char) {
			char = char + "";
			switch (char) {
				case "\n": case "\r": case "\u0004":
					process.stdin.setRawMode(false);
					options.password = password;
					listAction(options);
					break;
				case "\u0003":
					stop = true;
					process.exit(1);
					break;
				default:
					process.stdout.write('*');
					password += char;
					break;
			}
		});
		function listAction(options) {
			if (options.database) {
				var pool = mysql.createPool({
					connectionLimit: 10,
					host: options.host || '127.0.0.1',
					user: options.username,
					password: options.password,
					database: options.database
				});
				pool.getConnection(function (err, connection) {
					if (err) {
						return console.log(err);
					}
					connection.query('SELECT table_name AS table_name FROM information_schema.tables WHERE table_schema = DATABASE()')
						.on('error', function (err) {
							console.log(err);
						})
						.on('result', function (row) {
							connection.pause();
							console.log('\n\n\t\t\t Table: ' + row.table_name + '\n');
							var table = new Table({
								head: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra']
							});
							pool.getConnection(function (err, innerconnection) {
								innerconnection.query('describe ' + row.table_name)
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
		};
	});
program.parse(process.argv);