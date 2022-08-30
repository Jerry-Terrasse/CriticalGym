import db from '../database/database';
import { Problem } from '../problem/problem';
import { User } from '../user/user';

export enum SubmissionStatusEnum {
	ok = 0,
	requesting_resubmit = 1,
	delete = 2,
}

class SubmissionManager {
	async addSubmission(problem: Problem, user: User, file: string): Promise<void> {
		await db.query("INSERT INTO submissions (user_id, problem_id, files, status) VALUES (?, ?, ?, ?)", [user.id, problem.id, file, SubmissionStatusEnum.ok]);
	}
}

export default new SubmissionManager();