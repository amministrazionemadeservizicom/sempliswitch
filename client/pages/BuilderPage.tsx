import { BuilderComponent, builder } from '@builder.io/react';
import { useEffect, useState } from 'react';

// Inizializza la tua chiave API di Builder.io
builder.init('ed526608f1d047ff84a64a77fc76092a');

interface BuilderPageProps {
  model?: string;
  url?: string;
}

export default function BuilderPage({ model = 'page', url = window.location.pathname }: BuilderPageProps) {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    builder
      .get(model, { url })
      .toPromise()
      .then((res) => {
        setContent(res);
      });
  }, [model, url]);

  return content ? (
    <BuilderComponent model={model} content={content} />
  ) : (
    <div className="p-8 text-center">Caricamento contenuto...</div>
  );
}