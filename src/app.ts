import os from "os";
import express from "express";
import formData from "express-form-data";
import config from "./config/config";
import problemManager, { hasPermission, groupNames, isInvalidGroup, Group, Chapter, Problem, ChapterStatusEnum, ProblemStatusEnum } from "./problem/problem";
import { User, userManager } from "./user/user";
import * as session from "express-session";
import expressMySqlSession from "express-mysql-session";
import fs from "fs";
import { ENUMS, readStream, submissionStatusColor } from "./utils/utils";

const app: express.Application = express();
const ExpressMySqlStoreSession = expressMySqlSession(session);

app.set("view engine", "ejs");
app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));

declare module "express-session" {
  interface SessionData {
    user: User;
  }
}

const formDataoptions = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};

const sessionOptions = {
  connectionLimit: 10,
  password: config.db.password,
  user: config.db.user,
  database: config.db.database,
  host: config.db.host,
  port: config.db.port,
  createDatabaseTable: false,
  schema: {
    tableName: "sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  },
};
let sessionStore = new ExpressMySqlStoreSession(sessionOptions);

app.use(
  session.default({
    secret: config.secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 * 2, // 2 weeks
    },
  })
);

// parse data with connect-multiparty.
app.use(formData.parse(formDataoptions));
// delete from the request all empty files (size == 0)
app.use(formData.format());
// change the file objects to fs.ReadStream
app.use(formData.stream());
// union the body and the files
app.use(formData.union());

app.get("/", (req: express.Request, res: express.Response) => {
  res.render("index", { user: req.session.user, ENUMS: ENUMS });
});

app.get("/gym/:group/:chapter/:problem", async (req: express.Request, res: express.Response) => {
  let user = req.session.user;
  if(!user) {
    return res.render("error", { message: "You need to login first" , user: user});
  }
  let group = parseInt(req.params.group);
  let chapter = parseInt(req.params.chapter);
  let problem = parseInt(req.params.problem);
  if(isInvalidGroup(group) || !Number.isInteger(chapter) || !Number.isInteger(problem)) {
    return res.render("error", { message: "Invalid problem", user: user, ENUMS: ENUMS });
  }
  // TODO: simplify this
  if(user.choice != group) {
    if(hasPermission(group, user.permission)) {
      return res.render("error", { message: `Please switch your group from ${groupNames[user.choice]} to ${groupNames[group]}`, user: user, ENUMS: ENUMS });
    } else {
      return res.render("error", { message: `You don't have permission to problem of ${groupNames[group]}`, user: user, ENUMS: ENUMS });
    }
  }
  let chapters = await problemManager.getChapterList(group);
  if(!Number.isInteger(chapter) || chapter < 0 || chapter >= chapters.length) {
    return res.render("error", { message: "Invalid chapter", user: user, ENUMS: ENUMS });
  }
  let chapterDetail = await problemManager.getChapterDetail(chapters[chapter], user);
  if(chapterDetail.status == ChapterStatusEnum.locked) {
    return res.render("error", { message: "This chapter has not been unlocked.", user: user, ENUMS: ENUMS });
  }
  if(!Number.isInteger(problem) || problem < 0 || problem >= chapterDetail.problems.length) {
    return res.render("error", { message: "Invalid problem", user: user, ENUMS: ENUMS });
  }
  if(chapterDetail.problemStatus[problem] == ProblemStatusEnum.locked) {
    return res.render("error", { message: "This problem has not been unlocked, please finish the previous problems first", user: user, ENUMS: ENUMS });
  }
  return res.render("gym_problem", { chapter: chapterDetail, problem: chapterDetail.problems[problem], status: chapterDetail.problemStatus[problem],  user: user, ENUMS: ENUMS });
});

app.get("/gym/:group/:chapter", async (req: express.Request, res: express.Response) => {
  let user = req.session.user;
  if(!user) {
    return res.render("error", { message: "You need to login first" , user: user, ENUMS: ENUMS });
  }
  let group = parseInt(req.params.group);
  let chapter = parseInt(req.params.chapter);
  if(isInvalidGroup(group)) {
    return res.render("error", { message: "Invalid group", user: user, ENUMS: ENUMS });
  }
  if(user.choice != group) {
    if(hasPermission(group, user.permission)) {
      return res.render("error", { message: `Please switch your group from ${groupNames[user.choice]} to ${groupNames[group]}`, user: user, ENUMS: ENUMS });
    } else {
      return res.render("error", { message: `You don't have permission to problem of ${groupNames[group]}`, user: user, ENUMS: ENUMS });
    }
  }
  let chapters = await problemManager.getChapterList(group);
  if(!Number.isInteger(chapter) || chapter < 0 || chapter >= chapters.length) {
    return res.render("error", { message: "Invalid chapter", user: user, ENUMS: ENUMS });
  }
  let chapterDetail = await problemManager.getChapterDetail(chapters[chapter], user);
  if(chapterDetail.status == ChapterStatusEnum.locked) {
    return res.render("error", { message: "This chapter has not been unlocked.", user: user, ENUMS: ENUMS });
  }
  return res.render("gym_chapter", { user: user, chapter: chapterDetail, ENUMS: ENUMS });
});

app.get("/gym/:group", async (req: express.Request, res: express.Response) => {
  let user = req.session.user;
  if(!user) {
    return res.render("error", { message: "You need to login first" , user: user, ENUMS: ENUMS });
  }
  let group = parseInt(req.params.group);
  if(isInvalidGroup(group)) {
    return res.render("error", { message: "Invalid group", user: user, ENUMS: ENUMS });
  }
  if(user.choice != group) {
    if(hasPermission(group, user.permission)) {
      return res.render("error", { message: `Please switch your group from ${groupNames[user.choice]} to ${groupNames[group]}`, user: user, ENUMS: ENUMS });
    } else {
      return res.render("error", { message: `You don't have permission to problems of ${groupNames[group]}`, user: user, ENUMS: ENUMS });
    }
  }
  let chapters = await problemManager.getChapterList(group);
  let chapterListDetail = await problemManager.getChapterListDetail(chapters, user);
  return res.render("gym_group", { user: user, group: group, chapters: chapterListDetail, ENUMS: ENUMS});
});

app.get("/gym", async (req: express.Request, res: express.Response) => {
  let user = req.session.user;
  if(!user) {
    return res.render("error", { message: "You need to login first" , user: user, ENUMS: ENUMS });
  }
  res.redirect(`/gym/${user.choice}`);
});

// API
app.get(
  "/api/problem_content/:id",
  async (req: express.Request, res: express.Response) => {
    let user = req.session.user;
    if(!user) {
      return res.json({ success: false, message: "You need to login first" });
    }
    let id: number = parseInt(req.params.id);
    if (id === NaN) {
      return res.json({ success: false, message: "Invalid id" });
    }
    let problem = await problemManager.getProblemContextById(id);
    if (problem == "") {
      return res.json({ success: false, message: "Invalid id" });
    }
    return res.json({ success: true, data: problem });
  }
);

app.get(
  "/api/switch_choice",
  async (req: express.Request, res: express.Response) => {
    let user = req.session.user;
    if(!user) {
      return res.json({ success: false, message: "You need to login first" });
    }
    let _choice = req.query.choice;
    if(typeof _choice != "string") {
      return res.json({ success: false, message: "Invalid choice" });
    }
    let choice = parseInt(_choice);
    if(isInvalidGroup(choice)) {
      return res.json({ success: false, message: "Invalid choice" });
    }
    if(!hasPermission(choice, user.permission)) {
      return res.json({ success: false, message: `You don't have the permission to switch to ${groupNames[choice]}` });
    }
    user.choice = choice;
    userManager.switch_choice(user, choice);
    res.json({ success: true });
  }
)

app.post("/api/submit", async (req: express.Request, res: express.Response) => {
  // let user = req.session.user;
  // if (!user) {
  //   res.json({ success: false, message: "Not logged in" });
  //   return;
  // }
  // let problem_id = parseInt(req.body.problem_id);
  // if (!problem_id) {
  //   res.json({ success: false, message: "Invalid problem id" });
  //   return;
  // }
  // let problem = problemManager.getProblem(problem_id);
  // if (problem.empty) {
  //   res.json({ success: false, message: "Problem not found" });
  //   return;
  // }
  // let user_permission = user.permission;
  // user_permission = user_permission ? user_permission : 0;
  // if (problem.permission > user_permission) {
  //   res.json({
  //     success: false,
  //     message: "You do not have permission to submit",
  //   });
  //   return;
  // }
  // let codeStream: fs.ReadStream = req.body.code;
  // let code = await readStream(codeStream);
  // if (code.length < 1) {
  //   res.json({ success: false, message: "Empty code" });
  //   return;
  // }
  // // let language = req.body.language; TODO
  // let language = Language.cpp;
  // let submissionId = -1;
  // try {
  //   submissionId = await submissionManager.addSubmission(
  //     problem_id,
  //     user.id,
  //     language,
  //     { code: code }
  //   );
  //   res.json({ success: true, url: `/submission/${submissionId}` });
  // } catch (e) {
  //   let message = "";
  //   if (e instanceof Error) {
  //     message = e.message;
  //   } else {
  //     console.log(`Unknown error: ${e}`);
  //     message = "Unknown Error ${e}";
  //   }
  //   if (submissionId != -1) {
  //     await submissionManager.setSubmissionFailStatus(
  //       submissionId,
  //       SubmissionStatus.UE,
  //       { code: code, error: message }
  //     );
  //   }
  //   if (e instanceof FailSubmission) {
  //     res.json({ success: false, message: e.message });
  //   } else {
  //     console.log(e);
  //     res.json({ success: false, message: "Unknown error" });
  //   }
  // }
  // try {
  //   await judger.judge(user, problem, language, code, submissionId);
  // } catch (e) {
  //   let message = "";
  //   if (e instanceof Error) {
  //     message = e.message;
  //   } else {
  //     message = "Unknown Error ${e}";
  //   }
  //   console.log(`Judge Error: ${message}`);
  //   if (submissionId != -1) {
  //     await submissionManager.setSubmissionFailStatus(
  //       submissionId,
  //       SubmissionStatus.UE,
  //       { code: code, error: message }
  //     );
  //   }
  // }
  // return;
});

app.post("/login", async (req: express.Request, res: express.Response) => {
  let username: string = req.body.username;
  let password: string = req.body.password;
  if (!username || !password) {
    console.log("Invalid login");
    res.json({ success: false, message: "Invalid username or password" });
    return;
  }
  let user = await userManager.getUserByUsername(username);
  if (!user) {
    console.log("Invalid username");
    res.json({ success: false, message: "Invalid username" });
    return;
  }
  if (user.password !== password) {
    console.log("Invalid password");
    res.json({ success: false, message: "Wrong password" });
    return;
  }
  console.log(`User ${username} logged in, his choice is ${user.choice}`);
  req.session.user = user;
  res.json({ success: true });
  return;
});

app.get("/logout", (req: express.Request, res: express.Response) => {
  let user = req.session.user;
  if (!user) {
    return res.json({ success: false, message: "Not logged in" });
  }
  req.session.user = undefined;
  let username = user.username;
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(`User ${username} logged out`);
  });
  res.redirect("/");
  return;
});

// Error Handler

app.get("/*", (req: express.Request, res: express.Response) => {
  res.render("error", { message: "Page not found", user: req.session.user, ENUMS: ENUMS });
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
  ) => {
    res.render("error", { message: err.message, user: req.session.user, ENUMS: ENUMS });
  }
);

let port = 3000;

// Start server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});