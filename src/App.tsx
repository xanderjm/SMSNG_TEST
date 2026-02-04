import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { AgenticDeviceSimulator } from './experiments/agentic-device-simulator';
import { DigitalMaterialLab } from './experiments/digital-material-lab';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/experiments/agentic-device-simulator" element={<AgenticDeviceSimulator />} />
        <Route path="/experiments/digital-material-lab" element={<DigitalMaterialLab />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
