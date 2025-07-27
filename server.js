const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// ✅ Corregido: ruta sin 'browser'
const distFolder = path.join(__dirname, 'dist', 'sl-dev-deshboard');

app.use(express.static(distFolder));

app.get('*', (req, res) => {
    res.sendFile(path.join(distFolder, 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor Angular escuchando en puerto ${port}`);
});
