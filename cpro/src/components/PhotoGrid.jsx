import {useRef, useState} from 'react';
import Button from './Button';

export default function PhotoGrid({photos=[]}){
  const dialogRef = useRef(null);
  const [current, setCurrent] = useState(null);

  const open = (photo) => {
    setCurrent(photo);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <div className="grid">
        {photos.map((p, i)=>(
          <figure key={i} className="thumb" onClick={()=>open(p)}>
            <img src={p.src} alt={p.alt ?? `Foto ${i+1}`} loading="lazy" />
          </figure>
        ))}
      </div>

      <dialog ref={dialogRef} className="lightbox" onCancel={close}>
        {current && (
          <div className="lightbox-content">
            <div className="lightbox-header">
              <span style={{color:'var(--muted)'}}>{current.caption || current.alt || 'Prévia'}</span>
              <Button variant="ghost" onClick={close} aria-label="Fechar">Fechar</Button>
            </div>
            <img className="lightbox-img" src={current.src} alt={current.alt || ''} />
          </div>
        )}
      </dialog>
    </>
  );
}