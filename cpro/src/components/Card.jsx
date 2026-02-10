export default function Card({title, subtitle, children, footer}){
  return (
    <section className="panel" style={{padding: '1.1rem'}}>
      {title && <h2>{title}</h2>}
      {subtitle && <p style={{marginTop: '.25rem'}}>{subtitle}</p>}
      <div style={{marginTop: '1rem'}}>{children}</div>
      {footer && <div style={{marginTop:'1rem', borderTop:'1px solid var(--border)', paddingTop:'.8rem'}}>{footer}</div>}
    </section>
  );
}