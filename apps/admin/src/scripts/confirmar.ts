/** Los botones que borran abren su diálogo de confirmación. */
export const conectarConfirmar = (): void => {
  const dialogo = document.querySelector<HTMLDialogElement>("dialog[data-borrar]");
  document
    .querySelector("[data-abrir-borrar]")
    ?.addEventListener("click", () => dialogo?.showModal());
};
