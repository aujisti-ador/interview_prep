import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Doc, ErrorBox, Loading, PageHeader } from '../components/ui';

export default function DocPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['doc', id],
    queryFn: () => api.get<{ id: string; title: string; body: string }>(`/docs/${id}`),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return <div className="text-ink-400">Not found.</div>;

  // The body may or may not open with an `# ` heading, so the page cannot rely
  // on the markdown to supply its h1. Print the title and drop a leading
  // duplicate heading if the doc happens to repeat it.
  const body = data.body.replace(
    new RegExp(`^\\s*#\\s+${data.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n`),
    '',
  );

  return (
    <article className="max-w-3xl">
      <PageHeader title={data.title} />
      <Doc body={body} />
    </article>
  );
}
