const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.static("dist"));
app.use(express.json());

let notes = [
  {
    id: "1",
    content: "HTML is easy",
    important: true,
  },
  {
    id: "2",
    content: "Browser can execute only JavaScript",
    important: false,
  },
  {
    id: "3",
    content: "GET and POST are the most important methods of HTTP protocol",
    important: true,
  },
];

app.get("/api/notes", (request, response) => {
  response.json(notes);
});

app.get("/api/note/:id", (request, response) => {
  const id = request.params.id;
  const note = notes.find((note) => note.id === id);

  if (note) {
    response.json(note);
  } else {
    response.statusMessage = "Note not found";
    response.status(404).end();
  }
});

app.delete("/api/note/:id", (request, response) => {
  const id = request.params.id;
  notes = notes.filter((note) => note.id !== id);
  response.status(204).end();
});

const generateId = () => {
  const maxId =
    notes.length > 0 ? Math.max(...notes.map((n) => Number(n.id))) : 0;
  return String(maxId + 1);
};

app.post("/api/notes", (request, response) => {
  const body = request.body;

  if (!body.content) {
    return response.status(400).json({
      error: "content missing",
    });
  }

  const note = {
    content: body.content,
    important: body.important || false,
    id: generateId(),
  };

  notes = notes.concat(note);
  response.json(note);
});

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

app.use(unknownEndpoint);

const PORT = process.env.PORT || 3001;
app.listen(PORT);
console.log(`server running on port ${PORT}`);
