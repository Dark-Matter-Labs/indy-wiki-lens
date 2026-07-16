import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/shell/Layout'
import { useGraphState } from '@/lib/graph'
import { Home } from '@/views/home/Home'
import { GoalSpace } from '@/views/goalspace/GoalSpace'
import { Portfolio } from '@/views/portfolio/Portfolio'
import { Matching } from '@/views/matching/Matching'
import { Sequence } from '@/views/sequence/Sequence'
import { Feed } from '@/views/feed/Feed'
import { Axioms } from '@/views/axioms/Axioms'
import { Ladder } from '@/views/ladder/Ladder'
import { Observatory } from '@/views/observatory/Observatory'
import { PageView } from '@/views/page/PageView'
import { NotFound } from '@/views/NotFound'
import { LoadError, LoadingScreen } from '@/components/shell/LoadStates'

export function App() {
  const state = useGraphState()

  return (
    <Layout>
      {state.status === 'loading' && <LoadingScreen />}
      {state.status === 'error' && <LoadError error={state.error} />}
      {state.status === 'ready' && (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/goals" element={<GoalSpace />} />
          <Route path="/goals/*" element={<GoalSpace />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/how" element={<Matching />} />
          <Route path="/sequence" element={<Sequence />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/axioms" element={<Axioms />} />
          <Route path="/ladder" element={<Ladder />} />
          <Route path="/observatory" element={<Observatory />} />
          <Route path="/p/*" element={<PageView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </Layout>
  )
}
