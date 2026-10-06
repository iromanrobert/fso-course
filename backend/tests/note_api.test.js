const { test, after, beforeEach, describe } = require("node:test");
const bcrypt = require("bcrypt");
const assert = require("node:assert");
const mongoose = require("mongoose");
const supertest = require("supertest");
const helper = require("./test_helpers");
const Note = require("../models/note");
const User = require("../models/users");

const app = require("../app");

const api = supertest(app);

beforeEach(async () => {
  await Note.deleteMany({});

  const noteObjects = helper.initialNotes.map((note) => new Note(note));
  const promiseArray = noteObjects.map((note) => note.save());
  await Promise.all(promiseArray);
});

test("Notes are returned as json ", async () => {
  await api
    .get("/api/notes")
    .expect(200)
    .expect("Content-Type", /application\/json/);
});

after(async () => {
  await mongoose.connection.close();
});

test("All notes are returned", async () => {
  const response = await api.get("/api/notes");
  assert.strictEqual(response.body.length, helper.initialNotes.length);
});

test("A specific note is within the returned notes", async () => {
  const response = await api.get("/api/notes");

  const contents = response.body.map((e) => e.content);

  assert(contents.includes("HTML is cool"));
});

test("A valid note can be added", async () => {
  const newNote = {
    content: "async/await simplifies making async calls",
    important: true,
  };

  await api
    .post("/api/notes")
    .send(newNote)
    .expect(201)
    .expect("Content-type", /application\/json/);

  const notesAtEnd = await helper.notesInDb();
  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length + 1);
  const contents = notesAtEnd.map((content) => content.content);

  assert(contents.includes("async/await simplifies making async calls"));
});

test("Note without content is not adde", async () => {
  const newNote = {
    important: true,
  };

  await api.post("/api/notes").send(newNote).expect(400);

  const notesAtEnd = await helper.notesInDb();
  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length);
});

test("A specific note can be viewed", async () => {
  const notesAtStart = await helper.notesInDb();
  const notesToView = notesAtStart[0];

  const resultNote = await api
    .get(`/api/notes/${notesToView.id}`)
    .expect(200)
    .expect("Content-Type", /application\/json/);

  assert.deepStrictEqual(resultNote.body, notesToView);
});

test("A note can be deleted", async () => {
  const notesAtStart = await helper.notesInDb();
  const noteToDelete = notesAtStart[0];

  await api.delete(`/api/notes/${noteToDelete.id}`).expect(204);

  const notesAtEnd = await helper.notesInDb();

  const ids = notesAtEnd.map((n) => n.id);
  assert(!ids.includes(noteToDelete.id));

  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length - 1);
});

describe("when there is initially one user in db", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash("sekret", 10);
    const user = new User({ username: "root", passwordHash });

    await user.save();
  });

  test("creation succeeds with a fresh username", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "rooobert",
      name: "Roman Robert",
      password: "independentei21/3",
    };

    await api
      .post("/api/users")
      .send(newUser)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1);

    const usernames = usersAtEnd.map((u) => u.username);
    assert(usernames.includes(newUser.username));
  });

  test("creation fails with proper statuscode and message if username already taken", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "root",
      name: "Superuser",
      password: "salainen",
    };

    const result = await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(result.body.error.includes("expected `username` to be unique"));

    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });
});
