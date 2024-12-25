// Database simpan
const WebSocket = require('ws');
const mysql = require('mysql2');

// Buat koneksi ke database
const db = mysql.createConnection({
    host: 'localhost',       // Ganti dengan host MySQL Anda
    user: 'root',            // Ganti dengan username MySQL Anda
    password: '',            // Ganti dengan password MySQL Anda
    database: 'chat_database'     // Nama database yang sudah dibuat
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi ke database gagal:', err);
        return;
    }
    console.log('Terhubung ke database MySQL!');
});

// Koneksi ke server-server lain

const servers = ['ws://192.168.1.11:8080', 'ws://192.168.1.12:8080'];

let serverConnections = [];

// Buat koneksi ke server lain
servers.forEach((url) => {
    const ws = new WebSocket(url);
    ws.on('open', () => {
        console.log(`Terhubung ke server: ${url}`);
        serverConnections.push(ws);
    });

    ws.on('message', (data) => {
        console.log(`Pesan diterima dari ${url}:`, data);
        // Kirim pesan ke klien lokal
        // wss.clients.forEach((client) => {
        //     if (client.readyState === WebSocket.OPEN) {
        //         client.send(data);
        //     }
        // });
        forwardToClients(data); // Kirim ke klien lokal
    });
    ws.on('error', (err) => {
        console.error(`Gagal terhubung ke server: ${url}`, err.message);
    });
});




// Buat server WebSocket
const wss = new WebSocket.Server({ port: 8080 });

console.log('Server berjalan di ws://localhost:8080');

// Fungsi untuk meneruskan pesan ke semua klien lokal
const forwardToClients = (message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};


// Modifikasi di dalam `wss.on('connection')`
wss.on('connection', (socket) => {
    console.log('Pengguna terhubung.');

    // Kirim riwayat pesan ke klien baru saat mereka terhubung
    const query = 'SELECT username, message FROM messages ORDER BY timestamp ASC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Gagal mengambil pesan dari database:', err);
            return;
        }
        // Kirim riwayat pesan ke klien
        results.forEach((row) => {
            socket.send(`${row.username}: ${row.message}`);
        });
    });

    // Event untuk menerima pesan baru dari klien
    socket.on('message', (data) => {
        try {
            // Konversi data menjadi string
            const message = data.toString();

            // Simpan pesan ke database
            const [username, messageContent] = message.split(': ');
            if (!username || !messageContent) {
                throw new Error('Format pesan tidak valid.');
            }

            const query = 'INSERT INTO messages (username, message) VALUES (?, ?)';
            db.query(query, [username, messageContent], (err) => {
                if (err) {
                    console.error('Gagal menyimpan pesan ke database:', err);
                }
            });

            // Kirim pesan baru ke semua klien lokal
            forwardToClients(message);

            // Kirim pesan ke server lain
            serverConnections.forEach((server) => {
                if (server.readyState === WebSocket.OPEN) {
                    server.send(message);
                }
            });
        } catch (err) {
            console.error('Error memproses pesan:', err.message);
        }
    });
});


// wss.on('connection', (socket) => {
//     console.log('Pengguna terhubung.');

//     // Kirim riwayat pesan ke klien baru saat mereka terhubung
//     const query = 'SELECT username, message FROM messages ORDER BY timestamp ASC';
//     db.query(query, (err, results) => {
//         if (err) {
//             console.error('Gagal mengambil pesan dari database:', err);
//             return;
//         }
//         // Kirim riwayat pesan ke klien
//         results.forEach((row) => {
//             socket.send(`${row.username}: ${row.message}`);
//         });
//     });

//     // Event untuk menerima pesan baru dari klien
//     socket.on('message', (data) => {
        
//         try {
//         // Konversi data menjadi string
//         const message = data.toString();

//         // Simpan pesan ke database
//         const [username, messageContent] = message.split(': ');

//         if (!username || !messageContent) {
//             throw new Error('Format pesan tidak valid.');
//         }

//         // Simpan pesan ke database
//         const query = 'INSERT INTO messages (username, message) VALUES (?, ?)';
//         db.query(query, [username, messageContent], (err) => {
//             if (err) {
//                 console.error('Gagal menyimpan pesan ke database:', err);
//             }
//         });

//         // Kirim pesan baru ke semua klien
//         wss.clients.forEach((client) => {
//             if (client.readyState === WebSocket.OPEN) {
//                 client.send(`${username}: ${messageContent}`);
//             }
//         });
//     } catch (err) {
//         console.error('Error memproses pesan:', err.message);
//     }
//     });
// });
