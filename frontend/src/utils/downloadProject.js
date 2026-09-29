export async function downloadProject(project, api) {
  const fileName = project.originalFileName || `${project.name || 'project'}.zip`;

  if (project.filePath?.startsWith('https://')) {
    const response = await api.get(`/projects/${project._id}/download`);
    const link = document.createElement('a');
    link.href = response.data.downloadUrl;
    link.download = response.data.fileName || fileName;
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
