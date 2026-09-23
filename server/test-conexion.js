// ============================================================================
// SCRIPT: server/test-conexion.js
// FUNCIÓN: prueba la conexión a MariaDB sin levantar el servidor.
// USO: npm run db:test   (desde server/)
// SALE CON 0 si conecta y los seeds existen; 1 si algo falla.
// ============================================================================
const pool = require("./db");

const ESPERADO = {
  tipos_documento: 11,
  campos_tipo: 137,
  permisos_rol: 20,
};

(async () => {
  try {
    const [[v]] = await pool.query("SELECT VERSION() AS v");
    console.log(`[OK] MariaDB: ${v.v}`);
    let ok = true;
    for (const [tabla, esp] of Object.entries(ESPERADO)) {
      const [[f]] = await pool.query(`SELECT COUNT(*) AS n FROM ${tabla}`);
      const marca = f.n === esp ? "OK" : "!!";
      if (f.n !== esp) ok = false;
      console.log(`[${marca}] ${tabla}: ${f.n} (esperado ${esp})`);
    }
    const [[admin]] = await pool.query(
      "SELECT hash_contrasena FROM usuarios WHERE correo = 'admin@sislegal.mx'"
    );
    if (!admin) {
      console.log("[!!] Falta el usuario admin@sislegal.mx");
      ok = false;
    } else if (admin.hash_contrasena === "PENDIENTE_HASH_BCRYPT") {
      console.log("[!!] Admin sin hash: entra con Admin123* una vez creado");
    } else {
      console.log("[OK] Admin con hash configurado");
    }
    await pool.end();
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.log(`[X] No conecta a MariaDB: ${e.message}`);
    process.exit(1);
  }
})();
