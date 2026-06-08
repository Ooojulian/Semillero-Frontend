import { ApplyVacancyForm } from '../../../components/apply/ApplyVacancyForm';

export default function ApplyVacancyPage({ params }: { params: { id: string } }) {
  return <ApplyVacancyForm vacancyId={params.id} />;
}
