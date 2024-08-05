const router = require('express').Router();

const {
    get_all_menu_byKuliner
} = require('../../controllers/MenuKulinerController')

router.get("/kuliner/menu/:id_kuliner", get_all_menu_byKuliner);

module.exports = router;