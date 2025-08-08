const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');

router.get('/', produtosController.listar);
router.get('/:id', produtosController.obter);
router.post('/', produtosController.criar);
router.put('/:id', produtosController.atualizar);
router.delete('/:id', produtosController.remover);

module.exports = router;
