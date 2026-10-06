const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const supertest = require("supertest");
const helper = require("./test_helpers");
const Note = require("../models/note");

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
