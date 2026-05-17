const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); //Al-ver yapabilmek için gerekli olan kod.
const bcrypt = require('bcryptjs'); //Şifreleme için

// Express kütüphanesini çalıştırıp app adında bir sunucu değişkeni oluşturuyor. Bütün değişkenler app'e yazılıyor.
const app = express();
app.use(express.json()); //Gelen JSON verilerini okuması için.
app.use(cors()); // Güvenlik iznini aktif hale getiriyor.

//SQL Bağlantısı için.
const database = mysql.createConnection({
        host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
        user: 'JBh7hUo3Tqn79nu.root',
        password: 'HGrAFfxGFQo30Ye1',
        database: 'bankApp',
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });
//Bağlantı kontrolü.
database.connect((err) => {
    if (err)
        console.error('Veritabanı bağlantı hatası: ', err);
    else
        console.log('MySQL veritabanına başarıyla bağlanıldı.');
});

//Veri ekleme
app.post('/api/kullanici-ekle', (req, res) => {
       const { ad, soyad, eposta, telefonNumarasi, sifre } = req.body; // Verilerin değişkene atandığı yer.
       const saltRounds = 10;
       const hashliSifre = await bcrypt.hash(sifre, saltRounds);
       const sql = 'INSERT INTO accountInformation (ad, soyad, eposta, telefonNumarasi, sifre) VALUES (?, ?, ?, ?, ?)'; // ? işaretleri güvenlik içindir.

       

       database.query(sql, [ad, soyad, eposta, telefonNumarasi], (err, result) => { 
            if(err){
                console.error(err);
                return res.status(500).json({  mesaj: 'Kayıt eklenemedi.', hata: err.message});
            }
            res.status(201).json({mesaj: 'Kullanıcı başarıyla eklendi.', id: result.insertId });


       });
    });

app.post('/api/giris-yap', (req, res) => {
    const {telefonNumarasi, sifre} = req.body;
    const sql = 'SELECT * FROM accountInformation WHERE telefonNumarasi = ?';

    database(sql, [telefonNumarasi], async (err, results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({ mesaj: 'Giriş işlemi sırasında hata oluştu.'});
        }
        if (results.length === 0){
            return res.status(401).json({ mesaj: 'E-posta veya şifre hatalı.'});
        }

        const kullanici = results[0];

        const sifreDogrulama = await bcrypt.compare(sifre, kullanici.sifre);
        if(!sifreDogrulama){
            return res.status(401).json({ mesaj: 'E-posta veya şifre hatalı.'});
        }

        res.status(200).json({
            mesaj: 'Giriş başarıyla tamamlandı.',
            kullanici:{
                id: kullanici.id,
                ad: kullanici.ad,
                soyad: kullanici.soyad,
                eposta: kullanici.eposta,
                telefonNumarasi: kullanici.telefonNumarasi
            }
        });
    });
});

//GET işleminin yapıldığı yer.
app.get('/api/kullanicilar', (req, res) => {
    const sql = 'SELECT * FROM accountInformation';

    database.query(sql, (err, results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({mesaj: 'Veriler Getirilemedi.', hata: err.message});
        }
        res.status(200).json(results); 
    });
});

//Sunucunun başlatıldığı yer.
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`API sunucusu şu anda http://localhost:${PORT} adresinde çalışıyor...`);
    });
}
module.exports = app;