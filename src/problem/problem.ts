import fs from 'fs';
import db from '../database/database'
import { SubmissionStatusEnum } from '../submission/submission';
import { User } from '../user/user';

// class ProblemManager {
// 	dir: string = './problems';
// 	problems: Array<Problem>;
// 	src_list: Array<string>;
// 	constructor() {
// 		this.problems = new Array<Problem>();
// 		this.src_list = new Array<string>();
// 		fs.readdir(this.dir, (err, files) => {
// 			if(err) {
// 				console.log(err);
// 				return;
// 			}
// 			for(let problem_dir of files) {
// 				try {
// 					let id = parseInt(problem_dir);
// 					if(id === NaN) {
// 						continue;
// 					}
// 					this.src_list[id] = `${this.dir}/${problem_dir}`;
// 				} catch(err) {
// 					console.log(err);
// 					continue;
// 				}
// 			}
// 		});
// 	}
// 	getProblem(id: number): Problem {
// 		if(id in this.src_list) {
// 			if(this.problems[id] == undefined) {
// 				let problem_dir = this.src_list[id];
// 				return this.problems[id] = this.loadProblem(problem_dir);
// 			} else {
// 				return this.problems[id];
// 			}
// 		} else {
// 			return new Problem(null);
// 		}
// 	}
// 	loadProblem(problem_dir: string): Problem {
// 		try {
// 			let md_file = problem_dir + '/problem.md';
// 			let info_file = problem_dir + '/info.json';
// 			let md_content = fs.readFileSync(md_file, 'utf8');
// 			let info = JSON.parse(fs.readFileSync(info_file, 'utf8'));
// 			return new Problem(
// 				info.id,
// 				info.permission,
// 				info.title,
// 				md_content,
// 				info.time_limit,
// 				info.memory_limit,
// 				info.difficulty,
// 				info.tags,
// 				info.judge
// 			);
// 		} catch(err) {
// 			console.log(err);
// 			console.log('Error loading problem ' + problem_dir);
// 			return new Problem(null);
// 		}
// 	}
// 	getProblemBriefListByPermission(permission: number): Array<ProblemBrief> {
// 		let problemList: Array<ProblemBrief> = new Array<ProblemBrief>();
// 		this.src_list.forEach((problem_dir, id) => {
// 			let problem = this.getProblem(id);
// 			if(problem.permission <= permission) {
// 				problemList.push(problem.getBrief());
// 			}
// 		});
// 		return problemList;
// 	}
// }

// type JudgeInfo = {
// 	type: string;
// 	testcase: number;
// 	prefix: string;
// }

// export class Problem {
// 	empty: boolean = true;
// 	id: number;
// 	permission: number;
	
// 	title: string;
// 	description: string;

// 	time_limit: number;
// 	memory_limit: number;

// 	difficulty: number;
// 	tags: Array<string>;

// 	judge: JudgeInfo;

// 	constructor(
// 		id: number | null, permission: number = 0,
// 		title="N/A", description="", time_limit=0, memory_limit=0,
// 		difficulty=0, tags=[], judge: JudgeInfo={type:'', testcase:0, prefix:''}
// 	) {
// 		if(id == null) {
// 			this.empty = true;
// 			this.id = -1;
// 		} else {
// 			this.empty = false;
// 			this.id = id;
// 		}
// 		this.title = title;
// 		this.description = description;
// 		this.time_limit = time_limit;
// 		this.memory_limit = memory_limit;
// 		this.difficulty = difficulty;
// 		this.permission = permission;
// 		this.tags = tags;
// 		this.judge = judge;
// 	}

// 	getBrief(): ProblemBrief {
// 		return new ProblemBrief(this.id, this.title);
// 	}
// }

// export class ProblemBrief {
// 	id: number;
// 	title: string;
// 	constructor(id: number, title: string) {
// 		this.id = id;
// 		this.title = title;
// 	}
// }

export enum Group {
	mechanic = 0, // 机械
	es = 1, // 嵌入式软件
	eh = 2, // 嵌入式硬件
	vision = 3, // 视觉
	publicity = 4, // 宣传
	rule = 5, // 规则测评
}

export let groupNames = ["机械组", "嵌入式软件组", "嵌入式硬件组", "视觉组", "宣传组", "规则测评"];

export function hasPermission(group: number, permission: number) {
	return Number.isInteger(group) && !Number.isNaN(group) && (permission & (1 << group));
}
export function isInvalidGroup(group: number) {
	return !Number.isInteger(group) || group < 0 || group > 5;
}


export type Chapter = {
	group: Group,
	chapter: number,
}

export enum ProblemStatusEnum {
	locked = 0,
	fresh = 1,
	solved = 2,
	requesting_resubmit = 3,
}
export enum ChapterStatusEnum {
	locked = 0,
	fresh = 1,
	progressing = 2,
	finished = 3,
}
export class ChapterDetail {
	title: string = "";
	group: number = -1;
	chapter: number = -1;
	status: ChapterStatusEnum = ChapterStatusEnum.locked;
	progress: number = 0;
	problems: Array<Problem> = [];
	problemStatus: Array<ProblemStatusEnum> = [];
}

export class Problem {
	id: number;
	name: string;
	group: Group;
	chapter: number;
	index: number;
	path: string;
	constructor(id: number, name: string, group: Group | number, chapter: number, index: number, path: string) {
		if(group < 0 || group > 5) {
			throw "Constructing a Problem object with an invalid group id";
		}
		this.id = id;
		this.name = name;
		this.group = group;
		this.chapter = chapter;
		this.index = index;
		this.path = path;
	}
}

class ProblemManager {
	cache: Map<number, string> = new Map<number, string>();

	async getProblemList(group: Group, chapter: number): Promise<Array<Problem>> {
		let res = (await db.query("SELECT * FROM problems WHERE `group` = ? AND `chapter` = ?", [group, chapter]))[0];
		for(let i = 0; i < res.length; i++) {
			res[i] = new Problem(res[i].id, res[i].name, res[i].group, res[i].chapter, res[i].index, res[i].path);
		}
		return res;
	}
	async getProblemContext(problem: Problem): Promise<string> {
		let context = this.cache.get(problem.id);
		if(!context) {
			context = await fs.promises.readFile(`problems/${problem.path}/problem.md`, 'utf8');
			this.cache.set(problem.id, context);
		}
		return context;
	}
	async getProblemById(id: number): Promise<Problem|null> {
		let res = (await db.query("SELECT * FROM problems WHERE id = ?", [id]))[0];
		if(res.length == 0) {
			return null;
		}
		return new Problem(res[0].id, res[0].name, res[0].group, res[0].chapter, res[0].index, res[0].path);
	}
	async getProblemContextById(id: number): Promise<string> {
		let problem = await this.getProblemById(id);
		if(!problem) {
			return "";
		}
		return await this.getProblemContext(problem);
	}
	async refreshCache(problem: Problem): Promise<void> {
		let context = await fs.promises.readFile(`problems/${problem.path}/problem.md`, 'utf8');
		this.cache.set(problem.id, context);
	}
	/**
	 * get the status of a problem according to the user's submissions
	 * @note this function would not check if the problem is locked or not
	 * */
	async getProblemStatus(problem: Problem, user: User): Promise<ProblemStatusEnum> {
		let res = (await db.query("SELECT * FROM submissions WHERE user_id = ? AND problem_id = ? ORDER BY status", [user.id, problem.id]))[0];
		if(res.length == 0) {
			return ProblemStatusEnum.fresh;
		}
		if(res[0].status == SubmissionStatusEnum.ok) {
			return ProblemStatusEnum.solved;
		}
		if(res[0].status == SubmissionStatusEnum.requesting_resubmit) {
			return ProblemStatusEnum.requesting_resubmit;
		}
		return ProblemStatusEnum.fresh;
	}
	lockProblems(problems: Array<ProblemStatusEnum>): void {
		let hasUnsolved = false;
		for(let i = 0; i < problems.length; i++) {
			if(problems[i] == ProblemStatusEnum.fresh) {
				if(hasUnsolved) {
					problems[i] = ProblemStatusEnum.locked;
				}
				hasUnsolved = true;
			}
		}
		return;
	}

	async getChapterList(group: Group): Promise<Array<Chapter>> {
		let res = (await db.query("SELECT * FROM chapters WHERE `group` = ?", [group]))[0];
		let list = new Array<Chapter>();
		for(let i = 0; i < res.length; i++) {
			list.push({group: res[i].group, chapter: res[i].chapter});
		}
		return list;
	}
	async getChapterDetail(chapter: Chapter, user: User): Promise<ChapterDetail> {
		let chapterDetail = new ChapterDetail();
		let chapter_res = (await db.query("SELECT * FROM chapters WHERE `group` = ? AND `chapter` = ?", [chapter.group, chapter.chapter]))[0];
		if(chapter_res.length != 0) {
			chapterDetail.title = chapter_res[0].title;
		}
		chapterDetail.group = chapter.group;
		chapterDetail.chapter = chapter.chapter;

		chapterDetail.status = this.checkChapterLocked(chapter, user);
		if(chapterDetail.status == ChapterStatusEnum.locked) { // if locked, there is no need to get the problem list
			return chapterDetail;
		}
		let res = (await db.query("SELECT * FROM problems WHERE `group` = ? AND `chapter` = ? ORDER BY `index`", [chapter.group, chapter.chapter]))[0];
		for(let i = 0; i < res.length; i++) {
			let problem = new Problem(res[i].id, res[i].name, res[i].group, res[i].chapter, res[i].index, res[i].path);
			chapterDetail.problems.push(problem);
		}
		let queries = new Array<Promise<ProblemStatusEnum>>();
		chapterDetail.problems.forEach(problem => {
			queries.push(this.getProblemStatus(problem, user)); // TODO: optimize this
		});
		let statuses = await Promise.all(queries);
		statuses.forEach(status => {
			if(status == ProblemStatusEnum.solved) {
				chapterDetail.progress++;
			}
			chapterDetail.problemStatus.push(status);
		});
		if(chapterDetail.progress != 0) {
			chapterDetail.status = ChapterStatusEnum.progressing;
		}
		if(chapterDetail.progress == chapterDetail.problems.length) {
			chapterDetail.status = ChapterStatusEnum.finished;
		}
		this.lockProblems(chapterDetail.problemStatus);
		return chapterDetail;
	}
	async getChapterListDetail(chapters: Array<Chapter>, user: User): Promise<Array<ChapterDetail>> {
		let queries = new Array<Promise<ChapterDetail>>();
		chapters.forEach(chapter => {
			queries.push(this.getChapterDetail(chapter, user));
		});
		return await Promise.all(queries);
	}
	checkChapterLocked(chapter: Chapter, user: User): ChapterStatusEnum {
		// now all chapters are unlocked
		return ChapterStatusEnum.fresh;
	}
}

export let problemManager = new ProblemManager();
export default problemManager;