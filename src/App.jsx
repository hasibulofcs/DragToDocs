import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import SignatureCanvas from './components/signature/Canvas'

function App() {

  return (
    <DndProvider backend={HTML5Backend}>
      <SignatureCanvas />
    </DndProvider>
  )
}

export default App
