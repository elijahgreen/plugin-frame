import express from 'express';
import path from 'path';

const PORT = 3001;

const app = express();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './dist/index.html'));
});

app.get('/host.js', (req, res) => {
  res.sendFile(path.join(__dirname, './dist/host.js'));
});

app.get('/remote.js', (req, res) => {
  res.sendFile(path.join(__dirname, './dist/remote.js'));
});

app.get('/remote.html', (req, res) => {
  res.sendFile(path.join(__dirname, './dist/remote.html'));
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
