const router = require('express').Router();

const {
    get_all_kuliner,
    get_detail_kuliner,
    get_all_kuliner_ByDesawisata
} = require('../../controllers/KulinerController')


router.get("/kuliner/get_all", get_all_kuliner);
router.get("/kuliner/:id_kuliner", get_detail_kuliner);
router.get("/kuliner/get_all/:id_desaWisata", get_all_kuliner_ByDesawisata);

module.exports = router;