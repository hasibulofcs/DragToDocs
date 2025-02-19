import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import DocumentSigner3 from './components/Documents/DocumentSigning3'

function App() {

  return (
    <DndProvider backend={HTML5Backend}>
      <DocumentSigner4 />
    </DndProvider>
  )
}

export default App
