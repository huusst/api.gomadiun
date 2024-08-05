const router = require('express').Router();

const {
    get_all_penginapan,
    get_detail_penginapan,
    get_all_penginapan_ByDesawisata,
    get_all_kamar_ByPenginapan,
    get_all_homestay_ByPenginapan
} = require('../../controllers/PenginapanController')

router.get("/penginapan/get_all", get_all_penginapan);
router.get("/penginapan/:id_penginapan", get_detail_penginapan);
router.get("/penginapan/kamar/:id_penginapan", get_all_kamar_ByPenginapan);
router.get("/penginapan/homestay/:id_penginapan", get_all_homestay_ByPenginapan);
router.get("/penginapan/get_all/:id_desaWisata", get_all_penginapan_ByDesawisata);

module.exports = router;