import { FlowViewer } from './FlowViewer';
import { demoData } from './demoData';

function App() {

  return (
    <div className="App">
      <FlowViewer parseFiles={demoData} />
    </div>
  );
}

export default App;
