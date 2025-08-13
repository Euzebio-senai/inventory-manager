/**
 * StockPro Backend — Node.js + Express + MySQL
 * Rotas compatíveis com /stockpro_api.js
 *
 * Para rodar:
 * 1) npm init -y
 * 2) npm i express cors mysql2 jsonwebtoken bcrypt dotenv morgan uuid dayjs
 * 3) Crie um arquivo .env (ver bloco no final) e ajuste credenciais do MySQL
 * 4) Importe o SQL de /stockpro_database.sql no seu MySQL
 * 5) node server.js (ou nodemon se preferir)
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const mysql = require('mysql2/promise');

dotenv.config();

const PORT = process.env.PORT || 3009;
const JWT_SECRET = process.env.JWT_SECRET || 'stockpro_secret_dev_only';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'stockpro',
  multipleStatements: true,
  dateStrings: true,
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

let pool;
(async () => {
  pool = await mysql.createPool(DB_CONFIG);
  console.log('✅ MySQL pool conectado');
})();

// Utilidades
const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
const auth = async (req, res, next) => {
  try {
    const authH = req.headers.authorization || '';
    const token = authH.startsWith('Bearer ') ? authH.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Sem token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, empresa_id, administrador_id }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido/expirado' });
  }
};

// RBAC simples
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Não autenticado' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Acesso negado' });
  next();
};

// Helper para consultas
async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ==========================
// AUTH
// ==========================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome_completo, email, senha, nivel_acesso = 'Básico', empresa_id = null, administrador_id = null } = req.body;
    if (!nome_completo || !email || !senha) return res.status(400).json({ success: false, message: 'Dados obrigatórios faltando' });

    const existe = await q('SELECT id FROM usuarios WHERE email=?', [email]);
    if (existe.length) return res.status(409).json({ success: false, message: 'Email já cadastrado' });

    const hash = await bcrypt.hash(senha, 10);
    const result = await q(
      'INSERT INTO usuarios (nome_completo, email, senha, nivel_acesso, empresa_id, administrador_id, ativo) VALUES (?,?,?,?,?,?,1)',
      [nome_completo, email, hash, nivel_acesso, empresa_id, administrador_id]
    );

    const user = { id: result.insertId, nome_completo, email, nivel_acesso, empresa_id, administrador_id };
    return res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erro no cadastro' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, user_type = 'user', company_id = null } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Informe email e senha' });

    // Tenta em usuarios, depois administradores
    let tabela = 'usuarios';
    let rows = await q('SELECT * FROM usuarios WHERE email=? AND ativo=1', [email]);

    if (!rows.length) {
      tabela = 'administradores';
      rows = await q('SELECT * FROM administradores WHERE email=? AND ativo=1', [email]);
    }

    if (!rows.length) return res.status(401).json({ success: false, message: 'Usuário não encontrado ou inativo' });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.senha);
    if (!ok) return res.status(401).json({ success: false, message: 'Senha inválida' });

    const role = tabela === 'administradores' ? 'admin' : 'user';

    // (Opcional) validar company_id se fornecido
    let empresa_id = u.empresa_id || null;
    if (company_id) empresa_id = company_id;

    const token = signToken({ id: u.id, email: u.email, role, empresa_id, administrador_id: u.administrador_id || null });

    // Registrar sessão (opcional, se tabela existir)
    try {
      const expiracao = dayjs().add(8, 'hour').format('YYYY-MM-DD HH:mm:ss');
      const sessionToken = uuidv4();
      const usuario_id = tabela === 'administradores' ? null : u.id;
      await q(
        'INSERT INTO sessoes_usuario (usuario_id, token, ip_address, user_agent, data_expiracao, ativo) VALUES (?,?,?,?,?,1)',
        [usuario_id || 0, sessionToken, req.ip, req.headers['user-agent'] || '', expiracao]
      );
    } catch (e) { /* silencioso se tabela não existir */ }

    const userPayload = {
      id: u.id,
      nome_completo: u.nome_completo,
      email: u.email,
      nivel_acesso: u.nivel_acesso || 'Admin',
      role,
      empresa_id,
    };

    return res.json({ success: true, token, user: userPayload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erro no login' });
  }
});

// ==========================
// CATEGORIAS
// ==========================
app.get('/api/categories', auth, async (req, res) => {
  try {
    const rows = await q('SELECT * FROM categorias WHERE ativo=1 ORDER BY nome');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar categorias' });
  }
});

app.post('/api/categories', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const r = await q('INSERT INTO categorias (nome, descricao, ativo) VALUES (?,?,1)', [nome, descricao || null]);
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar categoria' });
  }
});

app.put('/api/categories/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;
    await q('UPDATE categorias SET nome=?, descricao=? WHERE id=?', [nome, descricao || null, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar categoria' });
  }
});

app.delete('/api/categories/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await q('UPDATE categorias SET ativo=0 WHERE id=?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover categoria' });
  }
});

// ==========================
// EMPRESAS
// ==========================
app.get('/api/companies', auth, allowRoles('admin'), async (req, res) => {
  try {
    const rows = await q('SELECT * FROM empresas WHERE ativo=1 ORDER BY nome');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar empresas' });
  }
});

app.post('/api/companies', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email } = req.body;
    const r = await q(
      'INSERT INTO empresas (nome, cnpj, endereco, telefone, email, ativo) VALUES (?,?,?,?,?,1)',
      [nome, cnpj, endereco, telefone, email]
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar empresa' });
  }
});

app.put('/api/companies/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cnpj, endereco, telefone, email } = req.body;
    await q(
      'UPDATE empresas SET nome=?, cnpj=?, endereco=?, telefone=?, email=? WHERE id=?',
      [nome, cnpj, endereco, telefone, email, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar empresa' });
  }
});

app.delete('/api/companies/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await q('UPDATE empresas SET ativo=0 WHERE id=?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover empresa' });
  }
});

// ==========================
// PDV (Pontos de Venda)
// ==========================
app.get('/api/pos', auth, allowRoles('admin'), async (req, res) => {
  try {
    const rows = await q('SELECT p.id, p.nome, p.endereco, e.nome as empresa_nome FROM pontos_venda p LEFT JOIN empresas e ON p.empresa_id = e.id WHERE p.ativo=1 ORDER BY p.nome');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar PDVs' });
  }
});

app.post('/api/pos', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { nome, empresa_id, administrador_id, endereco } = req.body;
    const r = await q(
      'INSERT INTO pontos_venda (nome, empresa_id, administrador_id, endereco, ativo) VALUES (?,?,?,?,1)',
      [nome, empresa_id, administrador_id, endereco]
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar PDV' });
  }
});

app.put('/api/pos/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, empresa_id, endereco } = req.body;
    await q(
      'UPDATE pontos_venda SET nome=?, empresa_id=?, endereco=? WHERE id=?',
      [nome, empresa_id, endereco, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar PDV' });
  }
});

app.delete('/api/pos/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await q('UPDATE pontos_venda SET ativo=0 WHERE id=?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover PDV' });
  }
});

// ==========================
// PRODUTOS
// ==========================
app.get('/api/products', auth, async (req, res) => {
  try {
    const { empresa_id } = req.user;
    if (!empresa_id) return res.status(403).json({ success: false, message: 'Empresa não definida para o usuário' });

    const rows = await q(`
      SELECT p.*, c.nome as categoria_nome, e.nome as empresa_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN empresas e ON p.empresa_id = e.id
      WHERE p.ativo=1 AND p.empresa_id=?
      ORDER BY p.nome
    `, [empresa_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar produtos' });
  }
});

app.post('/api/products', auth, async (req, res) => {
  try {
    const { empresa_id } = req.user;
    if (!empresa_id) return res.status(403).json({ success: false, message: 'Empresa não definida para o usuário' });

    const { nome, descricao, categoria_id, tipo, quantidade_estoque, quantidade_minima, preco_custo, preco_venda, unidade_medida } = req.body;

    const r = await q(
      `INSERT INTO produtos (nome, descricao, categoria_id, tipo, quantidade_estoque, quantidade_minima, preco_custo, preco_venda, unidade_medida, empresa_id, codigo, ativo)
       VALUES (?,?,?,?,?,?,?,?,?,?, LPAD((SELECT COALESCE(MAX(CAST(codigo AS UNSIGNED)), 0) + 1 FROM produtos WHERE empresa_id=? FOR UPDATE), 4, '0'), 1)`,
      [nome, descricao, categoria_id, tipo, quantidade_estoque, quantidade_minima, preco_custo, preco_venda, unidade_medida, empresa_id, empresa_id]
    );

    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar produto' });
  }
});

app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user;
    const { nome, descricao, categoria_id, tipo, quantidade_minima, preco_custo, preco_venda, unidade_medida } = req.body;

    await q(
      `UPDATE produtos SET nome=?, descricao=?, categoria_id=?, tipo=?, quantidade_minima=?, preco_custo=?, preco_venda=?, unidade_medida=?
       WHERE id=? AND empresa_id=?`,
      [nome, descricao, categoria_id, tipo, quantidade_minima, preco_custo, preco_venda, unidade_medida, id, empresa_id]
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar produto' });
  }
});

app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user;
    await q('UPDATE produtos SET ativo=0 WHERE id=? AND empresa_id=?', [id, empresa_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover produto' });
  }
});

app.get('/api/products/low-stock', auth, async (req, res) => {
  try {
    const { empresa_id } = req.user;
    const rows = await q(`
      SELECT p.*, c.nome as categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.empresa_id=? AND p.ativo=1 AND p.quantidade_estoque <= p.quantidade_minima
      ORDER BY p.quantidade_estoque ASC
    `, [empresa_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar produtos com baixo estoque' });
  }
});

// ==========================
// CLIENTES
// ==========================
app.get('/api/clients', auth, async (req, res) => {
  try {
    const { empresa_id } = req.user;
    const rows = await q('SELECT * FROM clientes WHERE ativo=1 AND empresa_id=? ORDER BY nome_completo', [empresa_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar clientes' });
  }
});

app.post('/api/clients', auth, async (req, res) => {
  try {
    const { empresa_id } = req.user;
    const { nome_completo, cpf, cnpj, tipo_cliente, email, telefone, endereco, cidade, estado, cep } = req.body;
    const r = await q(
      `INSERT INTO clientes (nome_completo, cpf, cnpj, tipo_cliente, email, telefone, endereco, cidade, estado, cep, empresa_id, ativo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
      [nome_completo, cpf, cnpj, tipo_cliente, email, telefone, endereco, cidade, estado, cep, empresa_id]
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar cliente' });
  }
});

app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user;
    const { nome_completo, cpf, cnpj, tipo_cliente, email, telefone, endereco, cidade, estado, cep } = req.body;
    await q(
      `UPDATE clientes SET nome_completo=?, cpf=?, cnpj=?, tipo_cliente=?, email=?, telefone=?, endereco=?, cidade=?, estado=?, cep=?
       WHERE id=? AND empresa_id=?`,
      [nome_completo, cpf, cnpj, tipo_cliente, email, telefone, endereco, cidade, estado, cep, id, empresa_id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clients/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user;
    await q('UPDATE clientes SET ativo=0 WHERE id=? AND empresa_id=?', [id, empresa_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover cliente' });
  }
});

// ==========================
// USUARIOS
// ==========================
app.get('/api/users', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { empresa_id } = req.user;
    const rows = await q('SELECT id, nome_completo, email, nivel_acesso, ativo FROM usuarios WHERE empresa_id=? AND ativo=1 ORDER BY nome_completo', [empresa_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
  }
});

app.post('/api/users', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { empresa_id } = req.user;
    const { nome_completo, email, senha, nivel_acesso, administrador_id } = req.body;
    
    const existe = await q('SELECT id FROM usuarios WHERE email=? AND empresa_id=?', [email, empresa_id]);
    if (existe.length) return res.status(409).json({ success: false, message: 'Email já cadastrado para esta empresa' });

    const hash = await bcrypt.hash(senha, 10);
    const r = await q(
      `INSERT INTO usuarios (nome_completo, email, senha, nivel_acesso, empresa_id, administrador_id, ativo)
       VALUES (?,?,?,?,?,?,1)`,
      [nome_completo, email, hash, nivel_acesso, empresa_id, administrador_id]
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário' });
  }
});

app.put('/api/users/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user;
    const { nome_completo, email, nivel_acesso } = req.body;
    await q(
      `UPDATE usuarios SET nome_completo=?, email=?, nivel_acesso=? WHERE id=? AND empresa_id=?`,
      [nome_completo, email, nivel_acesso, id, empresa_id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user;
    await q('UPDATE usuarios SET ativo=0 WHERE id=? AND empresa_id=?', [id, empresa_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover usuário' });
  }
});

// ==========================
// ADMINS
// ==========================
app.get('/api/admins', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { administrador_id } = req.user;
    const rows = await q('SELECT id, nome_completo, email, ativo FROM administradores WHERE id=? AND ativo=1', [administrador_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao listar administradores' });
  }
});

app.put('/api/admins/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_completo, email } = req.body;
    await q('UPDATE administradores SET nome_completo=?, email=? WHERE id=?', [nome_completo, email, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar administrador' });
  }
});

app.delete('/api/admins/:id', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await q('UPDATE administradores SET ativo=0 WHERE id=?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao remover administrador' });
  }
});

// ==========================
// DASHBOARD
// ==========================
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const { empresa_id } = req.user;
    const dashboardData = await q(`
      SELECT
        COUNT(DISTINCT p.id) as total_produtos,
        COUNT(DISTINCT c.id) as total_clientes,
        COUNT(DISTINCT v.id) as total_vendas,
        COALESCE(SUM(v.valor_final), 0) as valor_total_vendas_mes,
        (SELECT COUNT(id) FROM produtos WHERE empresa_id=? AND ativo=1 AND quantidade_estoque <= quantidade_minima) as produtos_baixo_estoque
      FROM empresas e
      LEFT JOIN produtos p ON e.id = p.empresa_id AND p.ativo=1
      LEFT JOIN clientes c ON e.id = c.empresa_id AND c.ativo=1
      LEFT JOIN pontos_venda pdv ON pdv.empresa_id = e.id
      LEFT JOIN vendas v ON v.pdv_id = pdv.id AND v.data_venda >= NOW() - INTERVAL 30 DAY
      WHERE e.id=?
      GROUP BY e.id;
    `, [empresa_id, empresa_id]);

    const lowStockProducts = await q(`
      SELECT p.id, p.nome, p.quantidade_estoque, p.quantidade_minima
      FROM produtos p
      WHERE p.empresa_id=? AND p.ativo=1 AND p.quantidade_estoque <= p.quantidade_minima
      ORDER BY p.quantidade_estoque ASC
      LIMIT 5
    `, [empresa_id]);

    const recentSales = await q(`
      SELECT v.numero_nota, v.valor_final, v.data_venda, c.nome_completo as cliente_nome
      FROM vendas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN pontos_venda pdv ON v.pdv_id = pdv.id
      WHERE pdv.empresa_id=?
      ORDER BY v.data_venda DESC
      LIMIT 5
    `, [empresa_id]);

    res.json({
      ...dashboardData[0],
      low_stock_products: lowStockProducts,
      recent_sales: recentSales
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Erro ao buscar dados do dashboard' });
  }
});

// ==========================
// VENDAS
// ==========================
app.post('/api/sales', auth, async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const { cliente_id, usuario_id, pdv_id, itens, desconto, observacoes, forma_pagamento } = req.body;
    const { empresa_id } = req.user;

    const [vendaResult] = await conn.execute(
      `INSERT INTO vendas (numero_nota, cliente_id, usuario_id, pdv_id, desconto, observacoes, forma_pagamento, valor_total, valor_final, status_venda)
       VALUES (LPAD((SELECT COALESCE(MAX(CAST(numero_nota AS UNSIGNED)), 0) + 1 FROM vendas FOR UPDATE), 6, '0'), ?, ?, ?, ?, ?, ?, 0, 0, 'Pendente')`,
      [cliente_id, usuario_id, pdv_id, desconto, observacoes, forma_pagamento]
    );

    const vendaId = vendaResult.insertId;
    let valorTotal = 0;

    for (const item of itens) {
      const { produto_id, quantidade, preco_unitario } = item;
      const precoTotal = quantidade * preco_unitario;

      await conn.execute(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, preco_total) VALUES (?,?,?,?,?)`,
        [vendaId, produto_id, quantidade, preco_unitario, precoTotal]
      );
      valorTotal += precoTotal;
    }

    const valorFinal = valorTotal - desconto;
    await conn.execute(
      `UPDATE vendas SET valor_total=?, valor_final=? WHERE id=?`,
      [valorTotal, valorFinal, vendaId]
    );

    // Movimentação de estoque já é feita via trigger (tr_atualizar_estoque_venda)

    await conn.commit();
    res.json({ success: true, venda_id: vendaId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ success: false, message: 'Erro ao registrar venda' });
  } finally {
    conn.release();
  }
});

// ==========================
// SERVIDOR
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});