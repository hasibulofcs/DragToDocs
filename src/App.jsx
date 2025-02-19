import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Signature1 from './components/signature/Signature1'

function App() {

  return (
    <DndProvider backend={HTML5Backend}>
      <Signature1 />
    </DndProvider>
  )
}

export default App
