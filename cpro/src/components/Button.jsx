export default function Button({variant='primary', as='button', children, ...props}){
  const Component = as;
  return (
    <Component className={`btn ${variant==='ghost' ? 'btn-ghost' : 'btn-primary'}`} {...props}>
      {children}
    </Component>
  );
}