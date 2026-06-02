import { pgTable, text, timestamp, primaryKey, integer, boolean, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}))

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}))

export const courses = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  topic: text("topic").notNull(),
  lengthPreset: text("length_preset").notNull(),
  visibility: text("visibility").notNull().default("private"),
  status: text("status").notNull().default("generating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  topic: text("topic").notNull(),
  youtubeVideoId: text("youtube_video_id"),
  videoTitle: text("video_title"),
  videoDuration: integer("video_duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
}))

export const questions = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  setIndex: integer("set_index").notNull().default(0),
  questionText: text("question_text").notNull(),
  options: text("options").notNull(),
  correctIndex: integer("correct_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const questionFlags = pgTable("question_flags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  flaggedAt: timestamp("flagged_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.questionId, t.userId),
}))

export const courseCompletions = pgTable("course_completions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.userId, t.courseId),
}))

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const userProgress = pgTable("user_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  passedQuiz: boolean("passed_quiz").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.userId, t.lessonId),
}))

export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, {
    fields: [courses.creatorId],
    references: [users.id],
  }),
  lessons: many(lessons),
}))

export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
}))
