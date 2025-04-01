import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Papa from "papaparse";
import jsPDF from "jspdf";

const entorno = "PROD"

/*const socket = io( entorno === "PROD"
    ? "https://smartwach-cardiaco-backend-b7hsf9b8a4fwhadt.brazilsouth-01.azurewebsites.net/"
    : "http://localhost:6548"
);*/

//


const socket = io("https://smartwach-cardiaco-backend-b7hsf9b8a4fwhadt.brazilsouth-01.azurewebsites.net/", {
  transports: ["websocket"], // Fuerza WebSocket y evita problemas con polling en Azure
  withCredentials: true, // Envía cookies si usas autenticación
  reconnectionAttempts: 5, // Intenta reconectar hasta 5 veces en caso de error
  timeout: 5000, // Tiempo de espera de 5s antes de cancelar la conexión
});



function App() {
  const [ritmoCardiaco, setRitmoCardiaco] = useState(null);
  const [oxigeno, setOxigeno] = useState(null);
  const [presion, setPresion] = useState({ sistolica: null, diastolica: null });
  const [temperatura, setTemperatura] = useState(null);
  const [data, setData] = useState([]);

  const [rangos, setRangos] = useState(() => {
    const storedRangos = localStorage.getItem("rangos");
    return storedRangos
      ? JSON.parse(storedRangos)
      : {
        bpm: { min: 60, max: 100 },
        o2InBlood: { min: 95, max: 100 },
        sistolica: { min: 90, max: 120 },
        diastolica: { min: 60, max: 80 },
        temperature: { min: 36, max: 37.5 },
      };
  });

  //Nombres visibles para métricas seleccionadas
  const nombresMetricas = {
    ritmoCardiaco: "Ritmo Cardíaco",
    oxigeno: "Oxígeno en Sangre",
    presion: "Presión Arterial",
    temperatura: "Temperatura Corporal",
  };

  //Estado para métricas seleccionadas
  const [metricasVisibles, setMetricasVisibles] = useState({
    ritmoCardiaco: true,
    oxigeno: true,
    presion: true,
    temperatura: true,
  });

  useEffect(() => {
    socket.on("newData", (data) => {
      console.log("📊 Datos recibidos en React:", data);

      setRitmoCardiaco(data.bpm);
      setOxigeno(data.o2InBlood);
      setPresion(data.presion);
      setTemperatura(data.temperature);

      setData((prevData) => {
        const newData = [
          ...prevData,
          {
            timestamp: new Date().toLocaleTimeString(),
            bpm: data.bpm,
            o2InBlood: data.o2InBlood,
            sistolica: data.presion.sistolica,
            diastolica: data.presion.diastolica,
            temperature: data.temperature,
          },
        ];
        return newData.slice(-20); // Mantiene solo los últimos 20 registros
      });
    });

    return () => socket.off("newData");
  }, []);

  // Setear rangos personalizados
  useEffect(() => {
    localStorage.setItem("rangos", JSON.stringify(rangos));
  }, [rangos]);

  //Cambiar rangos personalizados
  const cambiarRango = (metrica, tipo, valor) => {
    setRangos((prev) => {
      const nuevosRangos = {
        ...prev,
        [metrica]: { ...prev[metrica], [tipo]: Number(valor) }
      };

      // Guardar en localStorage inmediatamente después del cambio
      localStorage.setItem("rangos", JSON.stringify(nuevosRangos));
      return nuevosRangos;
    });
  };

  const resetRangos = () => {
    const valoresPorDefecto = {
      bpm: { min: 60, max: 100 },
      o2InBlood: { min: 95, max: 100 },
      sistolica: { min: 90, max: 120 },
      diastolica: { min: 60, max: 80 },
      temperature: { min: 36, max: 37.5 }
    };

    setRangos(valoresPorDefecto);
    localStorage.setItem("rangos", JSON.stringify(valoresPorDefecto)); // Guardar en localStorage
  };

  //  Manejar cambios en la selección de métricas
  const toggleMetrica = (metrica) => {
    setMetricasVisibles((prev) => ({
      ...prev,
      [metrica]: !prev[metrica],
    }));
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "signos_vitales.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Historial de Signos Vitales", 11, 20);

    let y = 45;
    data.forEach((item, index) => {
      doc.text(`${index + 1}. Timestamp: ${item.timestamp}`, 10, y);
      y += 14;
      doc.text(`   - BPM: ${item.bpm}`, 10, y);
      y += 8;
      doc.text(`   - O2 en sangre: ${item.o2InBlood}%`, 10, y);
      y += 8;
      doc.text(`   - Presión: ${item.sistolica}/${item.diastolica} mmHg`, 10, y);
      y += 8;
      doc.text(`   - Temperatura: ${item.temperature}°C`, 10, y);
      y += 20; // Más espacio antes del siguiente registro
    });

    doc.save("signos_vitales.pdf");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-5">
      <h1 className="text-3xl font-bold mb-4 titulo-monitor text-center">Monitor de Signos Vitales</h1>

      <div className="cards-container">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-6 mb-6"
        >

          {metricasVisibles.ritmoCardiaco && (

            <div className="p-4 bg-gray-800 rounded-lg shadow-md text-center cards">
              <h2 className="text-lg">Ritmo Cardíaco</h2>

              <p className={`text-2xl font-semibold ${ritmoCardiaco && (ritmoCardiaco < rangos.bpm.min
                || ritmoCardiaco > rangos.bpm.max) ? "text-red-500" : "text-white"}`}>
                {ritmoCardiaco ? `${ritmoCardiaco} BPM` : "Cargando..."}</p>

              {/* Inputs para cambiar los rangos */}
              <div className="mt-2 flex justify-center items-center gap-2">

                <input
                  type="number"
                  value={rangos.bpm.min}
                  onChange={(e) => cambiarRango("bpm", "min", e.target.value)}
                  className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                />

                <span className="text-white">-</span>

                <input
                  type="number"
                  value={rangos.bpm.max}
                  onChange={(e) => cambiarRango("bpm", "max", e.target.value)}
                  className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                />
              </div>
            </div>
          )}

          {metricasVisibles.temperatura && (
            <div className="p-4 bg-gray-800 rounded-lg shadow-md text-center cards">
              <h2 className="text-lg">Temperatura Corporal</h2>
              <p className={`text-2xl font-semibold ${temperatura && (temperatura < rangos.temperature.min
                || temperatura > rangos.temperature.max) ? "text-red-500" : "text-white"}`}>
                {temperatura ? `${temperatura} C°` : "Cargando..."}</p>

              {/* Inputs para cambiar los rangos */}
              <div className="mt-2 flex justify-center items-center gap-2">

                <input 
                  type="number"
                  value={rangos.temperature.min}
                  onChange={(e) => cambiarRango("temperature", "min", e.target.value)}
                  className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                />

                <span className="text-white">-</span>

                <input
                  type="number"
                  value={rangos.temperature.max}
                  onChange={(e) => cambiarRango("temperature", "max", e.target.value)}
                  className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                />
              </div>
            </div>
          )}

          {metricasVisibles.oxigeno && (
            <div className="p-4 bg-gray-800 rounded-lg shadow-md text-center cards ">
              <h2 className="text-lg mb-3">Oxígeno en Sangre</h2>
              <p className={`text-2xl font-semibold ${oxigeno && (oxigeno < rangos.o2InBlood.min
                || oxigeno > rangos.o2InBlood.max) ? "text-red-500" : "text-white"}`}>
                {oxigeno ? `${oxigeno} %` : "Cargando..."}</p>

              {/* Inputs para cambiar los rangos */}
              <div className="mt-2 flex justify-center items-center gap-2">

                <input
                  type="number"
                  value={rangos.o2InBlood.min}
                  onChange={(e) => cambiarRango("o2InBlood", "min", e.target.value)}
                  className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                />

                <span className="text-white">-</span>

                <input
                  type="number"
                  value={rangos.o2InBlood.max}
                  onChange={(e) => cambiarRango("o2InBlood", "max", e.target.value)}
                  className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                />
              </div>
            </div>
          )}

          {metricasVisibles.presion && (
            <div className="p-4 bg-gray-800 rounded-lg shadow-md text-center cards">
              <h2 className="text-lg">Presión Arterial</h2>
              <p className={`text-2xl font-semibold ${presion.sistolica && presion.diastolica &&
                (presion.sistolica < rangos.sistolica.min ||
                  presion.sistolica > rangos.sistolica.max ||
                  presion.diastolica < rangos.diastolica.min ||
                  presion.diastolica > rangos.diastolica.max)
                ? "text-red-500"
                : "text-white"
                }`}
              >
                {presion.sistolica && presion.diastolica
                  ? `${presion.sistolica}/${presion.diastolica} mmHg`
                  : "Cargando..."}
              </p>

              {/* Inputs para cambiar los rangos de la Presión Arterial */}
              <div className="mt-2 flex flex-col items-center gap-2">
                {/* Presión Sistólica */}
                <div className="flex justify-center items-center gap-2">
                  <span className="text-white">Sistólica</span>
                  <input
                    type="number"
                    value={rangos.sistolica.min}
                    onChange={(e) => cambiarRango("sistolica", "min", e.target.value)}
                    className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                  />
                  <span className="text-white">-</span>
                  <input
                    type="number"
                    value={rangos.sistolica.max}
                    onChange={(e) => cambiarRango("sistolica", "max", e.target.value)}
                    className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                  />
                </div>

                {/* Presión Diastólica */}
                <div className="flex justify-center items-center gap-2">
                  <span className="text-white">Diastólica</span>
                  <input
                    type="number"
                    value={rangos.diastolica.min}
                    onChange={(e) => cambiarRango("diastolica", "min", e.target.value)}
                    className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                  />
                  <span className="text-white">-</span>
                  <input
                    type="number"
                    value={rangos.diastolica.max}
                    onChange={(e) => cambiarRango("diastolica", "max", e.target.value)}
                    className="w-16 bg-gray-700 p-1 rounded text-white text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <button onClick={resetRangos} className="mb-10 cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Reiniciar Rangos
      </button>

      {/* Controles para seleccionar métricas */}
      <div className="mb-4 flex flex-wrap gap-4 div-show-metrics">
        {Object.keys(metricasVisibles).map((metrica) => (
          <label key={metrica} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={metricasVisibles[metrica]}
              onChange={() => toggleMetrica(metrica)}
              className="form-checkbox h-5 w-5 text-blue-600 cursor-pointer"
            />
            <span>{nombresMetricas[metrica] || metrica}</span>
          </label>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        <h2 className="text-xl font-semibold mb-3 text-center">Historial de Signos Vitales</h2>
        <LineChart width={630} height={300} data={data} className="bg-gray-800 p-4 rounded-lg shadow-md chart">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          {metricasVisibles.ritmoCardiaco && <Line type="monotone" dataKey="bpm" stroke="#ff7300" name="Ritmo Cardíaco" />}
          {metricasVisibles.oxigeno && <Line type="monotone" dataKey="o2InBlood" stroke="#007bff" name="Oxígeno en Sangre" />}
          {metricasVisibles.presion && <Line type="monotone" dataKey="sistolica" stroke="#ff0000" name="Sistólica" />}
          {metricasVisibles.presion && <Line type="monotone" dataKey="diastolica" stroke="#00ff00" name="Diastólica" />}
          {metricasVisibles.temperatura && <Line type="monotone" dataKey="temperature" stroke="#6a0dad" name="Temperatura" />}
        </LineChart>
      </motion.div>

      {/* Botones de Exportación */}
      <div className="mt-5 flex gap-4">

        <button onClick={exportToCSV} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded export-button">
          Exportar CSV
        </button>

        <button onClick={exportToPDF} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded export-button">
          Exportar PDF
        </button>

      </div>
    </div>
  );
}

export default App;