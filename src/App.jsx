import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import DocumentSigner1 from './components/Documents/DocumentSigning1'
import DocumentSigner2 from './components/Documents/DocumentSigning2'

function App() {

  return (
    <DndProvider backend={HTML5Backend}>
      <DocumentSigner2 />
    </DndProvider>
  )
}

export default App
