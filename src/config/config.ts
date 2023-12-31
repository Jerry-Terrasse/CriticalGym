import fs from 'fs';

class Config {
	configFile: string;
	secret: string;
	uploadDir: string;
	maxFileSize: number;
	maxFieldsSize: number;
	db: DBConfig;
	constructor(configFile: string) {
		this.configFile = configFile;
		let data = JSON.parse(fs.readFileSync(configFile, 'utf8'));

		this.secret = data.secret;
		this.uploadDir = data.uploadDir;
		this.maxFileSize = data.maxFileSize;
		this.maxFieldsSize = data.maxFieldsSize;

		this.db = new DBConfig(data.db);
	}
}

class DBConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
	constructor(data: any) {
		this.host = data.host;
		this.port = data.port;
		this.user = data.user;
		this.password = data.password;
		this.database = data.database;
	}
}

class CompilerConfig {
	name: string;
	args: string[];
	constructor(data: any) {
		this.name = data.name;
		this.args = data.args;
	}
}

let configFile = 'config.json';

let config: Config = new Config(configFile);

export default config;