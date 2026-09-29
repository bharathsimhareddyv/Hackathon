export async function downloadProject(project, api) {
  const fileName = project.originalFileName || `${project.name || 'project'}.zip`;

  if (project.filePath?.startsWith('https://')) {
    const link = document.createElement('a');
    link.href = project.filePath;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const response = await api.get(`/projects/${project._id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
