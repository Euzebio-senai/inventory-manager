const db = require('../models/db');

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM produtos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
};

exports.obter = async (req, res) => {
  const id = req.params.id;
  const [rows] = await db.query('SELECT * FROM produtos WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(rows[0]);
};

exports.criar = async (req, res) => {
  const dados = req.body;
  try {
    const [result] = await db.query(\`
      INSERT INTO produtos (codigo, nome, categoria_id, fornecedor_id, preco_compra, preco_venda, estoque, estoque_min, descricao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [dados.codigo, dados.nome, dados.categoria_id, dados.fornecedor_id, dados.preco_compra, dados.preco_venda, dados.estoque, dados.estoque_min, dados.descricao]
    );
    res.status(201).json({ id: result.insertId, ...dados });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar produto' });
  }
};

exports.atualizar = async (req, res) => {
  const id = req.params.id;
  const dados = req.body;
  try {
    await db.query(\`
      UPDATE produtos SET codigo=?, nome=?, categoria_id=?, fornecedor_id=?, preco_compra=?, preco_venda=?, estoque=?, estoque_min=?, descricao=?
      WHERE id=?\`,
      [dados.codigo, dados.nome, dados.categoria_id, dados.fornecedor_id, dados.preco_compra, dados.preco_venda, dados.estoque, dados.estoque_min, dados.descricao, id]
    );
    res.json({ id, ...dados });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
};

exports.remover = async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ mensagem: 'Produto removido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir produto' });
  }
};
