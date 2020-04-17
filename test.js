import { group, sleep, check } from 'k6';
import http from 'k6/http';

export default function() {

        group("Hello World", function() {
            console.log("Hello world");
        });
        
}
