import express from 'express';
import cors from 'cors';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.static('dist'));
app.listen(PORT, () => console.log(`listening on port ${PORT}`));
