const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

const distFolder = path.join(__dirname, 'dist', 'sl-dev-deshboard');
console.log(`Serving from: ${distFolder}`);

app.use(express.static(distFolder));

// ✅ compatible con path-to-regexp 7+ (usado por Express 5)
app.get(/^.*$/, (req, res) => {
    res.sendFile(path.join(distFolder, 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor Angular escuchando en puerto ${port}`);
});
