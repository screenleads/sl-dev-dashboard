const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('Servidor Express funcionando ✅');
});

app.listen(port, () => {
    console.log(`Servidor escuchando en puerto ${port}`);
});
