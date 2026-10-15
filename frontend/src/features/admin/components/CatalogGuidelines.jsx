import AdminIcon from './AdminIcon';

export default function CatalogGuidelines({ supporting = false }) {
  const items = supporting ? [
    ['supporting-shield', 'Registrar-approved only', 'Enter only Registrar-approved supporting-document types.'],
    ['supporting-users', 'Used by staff', 'Staff choose these stable types when requesting case documents.'],
    ['supporting-archive', 'Safe to deactivate', 'Deactivation hides new choices while retaining previous requirements and files.'],
  ] : [
    ['program-shield', 'Registrar-approved only', 'Add only programs approved by the Registrar.'],
    ['program-refresh', 'Deactivate or restore', 'Changing an entry’s status never alters saved student profiles.'],
    ['program-swap', 'Replacing an entry', 'To change a name or college, add the approved replacement, then deactivate the old entry.'],
  ];
  return <aside className="trace-section p-5" aria-label={supporting ? 'Supporting document guidelines' : 'Program guidelines'}><h4 className="mb-4 text-sm font-semibold">Guidelines</h4><ul className="space-y-4">{items.map(([icon, title, copy]) => <li className="flex items-start gap-3" key={title}><span className="trace-admin-catalog-icon"><AdminIcon name={icon} /></span><div className="min-w-0"><h5 className="text-xs font-semibold">{title}</h5><p className="trace-admin-caption leading-normal">{copy}</p></div></li>)}</ul></aside>;
}
