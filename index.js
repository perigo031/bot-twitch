const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Painel do Bot da Twitch rodando com sucesso!');
});

app.post('/api/view-bot', (req, res) => {
  console.log('Requisição recebida:', req.body);

  res.json({
    success: true,
    message: 'Bot acionado com sucesso!',
    dadosRecebidos: req.body,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;