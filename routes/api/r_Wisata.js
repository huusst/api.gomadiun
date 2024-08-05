const router = require('express').Router();

const {
    get_all_wisata,
    get_recomendasi_wisata,
    get_detail_wisata,
    get_all_wisata_byDesawisata,

    //admin
    get_all_wisata_byAdmin,
    get_detail_wisata_byAdmin,
    add_data_wisata_byAdmin,
    put_verifikasi_wisata,
    delete_data_wisata_byAdmin,
    update_data_wisata_byAdmin,
    put_update_maps_wisata,
    add_fasilitas_wisata_byAdmin
} = require('../../controllers/WisataController')


router.get("/wisata/get_all", get_all_wisata);
router.get("/wisata/get_all/:id_desaWisata", get_all_wisata_byDesawisata);
router.get("/wisata/detail/:id_wisata", get_detail_wisata);
router.post("/wisata/recomend", get_recomendasi_wisata);

//admin
router.get("/wisata/get_data/byAdmin", get_all_wisata_byAdmin);
router.get("/wisata/detail/byAdmin/:id_wisata", get_detail_wisata_byAdmin);
router.post("/wisata/add_data/byAdmin", add_data_wisata_byAdmin);
router.post("/wisata/add_fasilitas/byAdmin", add_fasilitas_wisata_byAdmin);
router.put("/wisata/update/byAdmin/:id_wisata", update_data_wisata_byAdmin);
router.put("/maps/update/byAdmin/:id_wisata", put_update_maps_wisata);
router.delete("/wisata/delete/byAdmin/:id_wisata", delete_data_wisata_byAdmin);
router.put("/wisata/verif/byAdmin/:id_wisata", put_verifikasi_wisata);

module.exports = router;