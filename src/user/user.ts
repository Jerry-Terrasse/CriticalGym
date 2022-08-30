import config from '../config/config';
import db from '../database/database';
import crypto from 'crypto';
import { Group } from '../problem/problem';

export class User {
	id: number;
	username: string;
	password: string;
	email: string;
	choice: number;
	group_choice: number;
	permission: number;

	gravatar_hash: string;
	constructor(id: number, username: string, password: string, email: string, choice: number, permission: number, group_choice: number) {
		this.id = id;
		this.username = username;
		this.password = password;
		this.email = email;
		this.choice = choice;
		this.permission = permission;
		this.group_choice = group_choice;

		this.gravatar_hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
		console.log(this.gravatar_hash);
	}
}

class UserManager {
	async getUserById(id: number): Promise<User | null> {
		if(id === NaN) {
			return null;
		}
		let res = (await db.query('SELECT * FROM users WHERE id = ?', [id]))[0];
		if(!res || res.length == 0) {
			return null;
		}
		return new User(res[0].id, res[0].username, res[0].password, res[0].email, res[0].choice, res[0].permission, res[0].group_choice);
	}
	async getUserByUsername(username: string): Promise<User | null> {
		if(username === '') {
			return null;
		}
		let res = (await db.query('SELECT * FROM users WHERE username = ?', [username]))[0];
		if(!res || res.length == 0) {
			return null;
		}
		return new User(res[0].id, res[0].username, res[0].password, res[0].email, res[0].choice, res[0].permission, res[0].group_choice);
	}
	async switch_choice(user: User, choice: Group): Promise<void> {
		await db.query('UPDATE users SET choice = ? WHERE id = ?', [choice, user.id]);
		if(choice != Group.rule) {
			await db.query('UPDATE users SET group_choice = ? WHERE id = ?', [choice, user.id]);
		}
		user.choice = choice;
	}
}

export let userManager = new UserManager();